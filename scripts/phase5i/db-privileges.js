#!/usr/bin/env node
/**
 * Phase 5I — Audit F : privilèges du rôle PostgreSQL (LECTURE SEULE).
 * N'imprime aucun secret : uniquement rôles, flags et grants.
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

const { rows: [role] } = await pool.query(
  `SELECT current_user AS usr,
          (SELECT rolsuper     FROM pg_roles WHERE rolname = current_user) AS super,
          (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS bypassrls,
          (SELECT rolcreatedb  FROM pg_roles WHERE rolname = current_user) AS createdb,
          (SELECT rolcreaterole FROM pg_roles WHERE rolname = current_user) AS createrole`
);
console.log(`ROLE: ${role.usr} | super=${role.super} bypassrls=${role.bypassrls} createdb=${role.createdb} createrole=${role.createrole}`);

const { rows: rls } = await pool.query(
  `SELECT relname, relrowsecurity FROM pg_class
    WHERE relname IN ('users','plans','subscriptions','payments','transactions') AND relkind = 'r'`
);
console.log("RLS par table:", JSON.stringify(rls.map((r) => `${r.relname}:rls=${r.relrowsecurity}`)));

const { rows: privs } = await pool.query(
  `SELECT table_name, privilege_type FROM information_schema.table_privileges
    WHERE grantee = current_user AND table_name IN ('users','plans','subscriptions','payments','transactions')
    ORDER BY table_name, privilege_type`
);
const byTable = {};
for (const p of privs) (byTable[p.table_name] ||= []).push(p.privilege_type);
console.log("GRANTS:", JSON.stringify(byTable));

const { rows: [{ n }] } = await pool.query("SELECT count(*)::int AS n FROM users");
console.log("LECTURE USERS OK — count =", n);
await pool.end();
