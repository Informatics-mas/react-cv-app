#!/usr/bin/env node
/**
 * Phase 5J-C — C1 : inventaire LECTURE SEULE du schéma déployé.
 * Tables, séquences, vues, triggers, politiques RLS, grants du rôle courant.
 * Aucun secret affiché. Aucune écriture.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../Backend/package.json"));
require("dotenv").config({ path: path.join(here, "../../Backend/.env") });
const pg = require("pg");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: true } : undefined,
  max: 1,
  connectionTimeoutMillis: 60_000
});

const q = async (sql) => (await pool.query(sql)).rows;

// 1. Objet par type
const objs = await q(
  `SELECT relkind, count(*)::int AS n FROM pg_class
    WHERE relnamespace = 'public'::regnamespace GROUP BY relkind ORDER BY relkind`
);
console.log("OBJETS public:", JSON.stringify(objs.map((o) => `${o.relkind}=${o.n}`)));

// 2. Tables
const tables = await q(
  `SELECT c.relname, c.relrowsecurity AS rls, c.relforcerowsecurity AS forced,
          pg_get_userbyid(c.relowner) AS owner
     FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
    ORDER BY c.relname`
);
console.log("TABLES:");
for (const t of tables) console.log(`  ${t.owner}/${t.relname} rls=${t.rls} forced=${t.forced}`);

// 3. Séquences (colonnes serial/identity éventuelles)
const seqs = await q(
  `SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'`
);
console.log("SEQUENCES:", JSON.stringify(seqs.map((s) => s.sequence_name)));

// 4. Vues et triggers
const views = await q(`SELECT table_name FROM information_schema.views WHERE table_schema = 'public'`);
console.log("VUES:", JSON.stringify(views.map((v) => v.table_name)));
const trigs = await q(
  `SELECT event_object_table, trigger_name FROM information_schema.triggers
    WHERE trigger_schema = 'public' ORDER BY 1, 2`
);
console.log("TRIGGERS:", JSON.stringify(trigs.map((t) => `${t.event_object_table}.${t.trigger_name}`)));

// 5. Politiques RLS
const pols = await q(
  `SELECT tablename, policyname, cmd, roles FROM pg_policies WHERE schemaname = 'public'`
);
console.log("POLICIES_RLS:", pols.length ? JSON.stringify(pols) : "(aucune)");

// 6. Privilèges du rôle courant par table
const grants = await q(
  `SELECT table_name, string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type) AS privs
     FROM information_schema.table_privileges
    WHERE grantee = current_user AND table_schema = 'public'
    GROUP BY table_name ORDER BY table_name`
);
console.log("GRANTS_ROLE_COURANT:");
for (const g of grants) console.log(`  ${g.table_name}: ${g.privs}`);

// 7. Droits sur le schéma public (fonction native — pas de vue schema_privileges)
const schemaPrivs = await q(
  `SELECT has_schema_privilege(current_user, 'public', 'USAGE') AS usage,
          has_schema_privilege(current_user, 'public', 'CREATE') AS create_`
);
console.log("GRANTS_SCHEMA_PUBLIC:", JSON.stringify(schemaPrivs[0]));

// 8. Flags du rôle courant + rôles existants (noms uniquement)
const role = await q(
  `SELECT current_user AS usr,
          (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS super,
          (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS bypassrls,
          (SELECT rolcreatedb FROM pg_roles WHERE rolname = current_user) AS createdb,
          (SELECT rolcreaterole FROM pg_roles WHERE rolname = current_user) AS createrole`
);
console.log("ROLE_COURANT:", JSON.stringify(role[0]));
const roles = await q(`SELECT rolname, rolbypassrls, rolcreatedb, rolcreaterole, rolsuper FROM pg_roles ORDER BY rolname`);
console.log("ROLES_EXISTANTS:");
for (const r of roles) console.log(`  ${r.rolname}: super=${r.rolsuper} bypassrls=${r.rolbypassrls} createdb=${r.rolcreatedb} createrole=${r.createrole}`);

await pool.end();
