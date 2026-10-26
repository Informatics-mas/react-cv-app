#!/usr/bin/env node
/**
 * Phase 5J-C — C4 : vérification du rôle applicatif SANS APPLICATION PERSISTANTE.
 * Transaction systématiquement annulée (ROLLBACK) : aucune trace en base,
 * aucune ligne existante touchée. Voir checks V0-V13.
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

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | ${detail}`);
};

const client = await pool.connect();
try {
  await client.query("BEGIN");

  // --- 1. Rôle temporaire + grants du plan (annulés en fin de script) ---
  const exists = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'cvcraft_app'");
  let createdHere = false;
  if (exists.rowCount === 0) {
    // CREATE ROLE pose déjà tous les flags sûrs ; ALTER ROLE (flags superuser-
    // protégés sur Supabase) est volontairement absent du plan.
    await client.query("CREATE ROLE cvcraft_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS");
    createdHere = true;
  }
  await client.query("GRANT USAGE ON SCHEMA public TO cvcraft_app");
  await client.query(
    "GRANT SELECT, INSERT, UPDATE, DELETE, TRIGGER ON TABLE users, plans, subscriptions, payments, transactions TO cvcraft_app"
  );
  // RLS actif sans politique = default deny : policies explicites pour le rôle
  // applicatif (l'alternative BYPASSRLS est écartée par le cahier des charges).
  for (const t of ["users", "plans", "subscriptions", "payments", "transactions"]) {
    await client.query(`DROP POLICY IF EXISTS cvcraft_app_all ON ${t}`);
    await client.query(`CREATE POLICY cvcraft_app_all ON ${t} FOR ALL TO cvcraft_app USING (true) WITH CHECK (true)`);
  }
  check("V0 rôle cvcraft_app + grants appliqués (transaction)", true,
    `existant_avant=${!createdHere} — tout sera annulé par ROLLBACK`);

  // Adhésion temporaire (transaction uniquement) pour pouvoir SET ROLE en test.
  // En production, l'application se connectera directement EN TANT QUE cvcraft_app.
  await client.query("GRANT cvcraft_app TO CURRENT_USER");

  // --- 2. Flags interdits ---
  const { rows: [flags] } = await client.query(
    "SELECT rolsuper AS super, rolcreatedb AS createdb, rolcreaterole AS createrole, rolbypassrls AS bypassrls FROM pg_roles WHERE rolname = 'cvcraft_app'"
  );
  check("V1 flags interdits absents (super/createdb/createrole/bypassrls)",
    flags.super === false && flags.createdb === false && flags.createrole === false && flags.bypassrls === false,
    JSON.stringify(flags));

  // --- 3. Tests positifs en tant que cvcraft_app (ligne de test isolée) ---
  await client.query("SET ROLE cvcraft_app");

  const sel = await client.query("SELECT count(*)::int AS n FROM plans");
  check("V2 SELECT plans autorisé", true, `plans lisibles (${sel.rows[0].n})`);

  const ins = await client.query(
    `INSERT INTO users (name, email, password, role, user_plan, user_max_downloads, downloads_used)
     VALUES ('Phase5J RoleTest', 'phase5j-roletest@test.local', 'x', 'user', 'Free', 5, 0) RETURNING id`
  );
  check("V3 INSERT users autorisé", ins.rowCount === 1, "ligne de test créée (annulée en fin de test)");
  const testId = ins.rows[0].id;

  const upd = await client.query("UPDATE users SET name = 'Phase5J RoleTest2' WHERE id = $1", [testId]);
  check("V4 UPDATE users autorisé", upd.rowCount === 1, "mise à jour de la ligne de test");

  // --- 4. Tests négatifs (SAVEPOINT par échec attendu) ---
  const neg = async (name, sql, expectFail = true) => {
    await client.query("SAVEPOINT sp_neg");
    try {
      await client.query(sql);
      await client.query("ROLLBACK TO SAVEPOINT sp_neg");
      check(name, !expectFail, expectFail ? "requête ACCEPTÉE (interdit !)" : "autorisée comme attendu");
    } catch (e) {
      await client.query("ROLLBACK TO SAVEPOINT sp_neg");
      check(name, expectFail, `refusée comme attendu (${e.code || String(e.message).slice(0, 40)})`);
    }
  };

  await neg("V5 SELECT id_map interdit", "SELECT count(*) FROM id_map");
  await neg("V6 TRUNCATE interdit", "TRUNCATE users");
  await neg("V7 CREATE TABLE interdit", "CREATE TABLE phase5j_probe (x int)");
  await neg("V8 ALTER TABLE interdit", "ALTER TABLE users RENAME TO users2");
  await neg("V9 DROP TABLE interdit", "DROP TABLE plans");
  await neg("V10 CREATE ROLE interdit", "CREATE ROLE phase5j_probe_role");
  await neg("V11 DELETE users autorisé (ligne de test)", "DELETE FROM users WHERE email = 'phase5j-roletest@test.local'", false);

  await client.query("RESET ROLE");

  // --- 5. Le rôle de migration/admin conserve ses droits ---
  const { rows: [adm] } = await client.query(
    "SELECT has_table_privilege(current_user, 'id_map', 'SELECT') AS can_read_map, has_table_privilege(current_user, 'users', 'TRUNCATE') AS can_trunc"
  );
  check("V12 rôle courant (migration/admin) conservé", adm.can_read_map === true && adm.can_trunc === true,
    `id_map SELECT=${adm.can_read_map}, TRUNCATE users=${adm.can_trunc}`);

  // --- 6. ROLLBACK global : aucune trace ---
  await client.query("ROLLBACK");
  const { rows: [{ n }] } = await client.query(
    "SELECT count(*)::int AS n FROM users WHERE email = 'phase5j-roletest@test.local'"
  );
  const still = await client.query("SELECT 1 FROM pg_roles WHERE rolname = 'cvcraft_app'");
  check("V13 ROLLBACK : aucune trace (ligne ET rôle)", n === 0 && still.rowCount === 0,
    `ligne_test=${n} (0), rôle_persistent=${still.rowCount === 0 ? "non" : "OUI !"} — transaction annulée`);
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  check("V0 exécution du plan", false, `ERREUR ${e.code || ""} ${e.message}`);
} finally {
  client.release();
  await pool.end();
}

console.log(failures === 0 ? "\nBILAN ROLE PG (DRY-RUN): TOUS PASS" : `\nBILAN ROLE PG (DRY-RUN): ${failures} FAIL`);
process.exitCode = failures > 0 ? 1 : 0;

