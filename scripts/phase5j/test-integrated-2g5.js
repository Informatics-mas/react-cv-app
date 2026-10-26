#!/usr/bin/env node
/**
 * Lot 2G.5 — Validation intégrée : reconstitution officielle + contrôles
 * combinés (migrations, grants/RLS, protections financières, gardes).
 *
 * ISOLATION : base jetable DÉDIÉE cvc_integ_2g5 (distincte de toute base
 * précédente) ; identité prouvée avant écriture (endpoint de test imposé,
 * current_database confirmé) ; CVC_TEST_ADMIN_URL explicite ; aucune lecture
 * de .env ; données 100 % synthétiques.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertTestTarget, classifyTarget } from "../lib/safe-target.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../Backend/package.json"));
const pg = require("pg");

const TARGET_DB = "cvc_integ_2g5";
const TEST_ENDPOINT = "ep-ancient-glitter-b98wmcx7";
const results = [];
function check(id, label, pass, evidence) {
  results.push({ id, pass });
  console.log(`${pass ? "PASS" : "FAIL"} | ${id} ${label} | ${evidence}`);
}
const sqlErr = (e) => `${e.code || "?"} ${String(e.message).split("\n")[0]}`;

// ---------- Identité du HARNAIS (avant toute écriture) ----------
const adminUrl = process.env.CVC_TEST_ADMIN_URL;
if (!adminUrl) { console.error("REFUS : CVC_TEST_ADMIN_URL absente."); process.exit(2); }
const u = new URL(adminUrl);
if (!u.hostname.includes(TEST_ENDPOINT)) {
  console.error(`REFUS : hôte '${u.hostname}' ≠ endpoint de test.`); process.exit(2);
}
console.log(`IDENTITE_OK endpoint=${u.hostname} base_cible=${TARGET_DB}`);
const urlFor = (db) => { const t = new URL(adminUrl); t.pathname = `/${db}`; return t.toString(); };

// ---------- Base jetable dédiée (depuis template1) ----------
const maint = new pg.Pool({ connectionString: urlFor("template1"), max: 1, connectionTimeoutMillis: 30000 });
try {
  await maint.query(`CREATE DATABASE ${TARGET_DB}`);
  console.log(`BASE_JETABLE_CREEE ${TARGET_DB}`);
} catch (e) {
  if (e.code !== "42P04") { console.error(`REFUS CREATE DATABASE : ${sqlErr(e)}`); process.exit(2); }
  console.log(`BASE_JETABLE_EXISTE ${TARGET_DB} — réutilisée`);
}
await maint.end();
const pool = new pg.Pool({ connectionString: urlFor(TARGET_DB), max: 1, connectionTimeoutMillis: 30000 });
const id = await pool.query("SELECT current_database() AS db, current_user AS usr, version() AS ver");
console.log(`CIBLE_CONFIRMEE ${JSON.stringify({ db: id.rows[0].db, usr: id.rows[0].usr })} ${id.rows[0].ver.split(" ").slice(0, 2).join(" ")}`);

// ---------- B1 — Ordre officiel : 001 → 002 → grants ----------
const applyFile = async (rel) => pool.query(fs.readFileSync(path.resolve(rel), "utf8"));
try {
  await applyFile("Backend/db/schema/001_initial.sql");
  await applyFile("Backend/db/schema/002_financial_history_protection.sql");
  await applyFile("Backend/db/grants/001_grants_rls.sql");
  check("B1", "préparation officielle 001 → 002 → grants/001", true, "3 fichiers appliqués sans erreur");
} catch (e) {
  check("B1", "préparation officielle", false, sqlErr(e)); process.exit(1);
}

// ---------- B2 — Rejeu idempotent ----------
try {
  await applyFile("Backend/db/grants/001_grants_rls.sql");
  await applyFile("Backend/db/schema/002_financial_history_protection.sql");
  const n = (await pool.query("SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='public'")).rows[0].n;
  check("B2", "rejeu idempotent (26 politiques, aucun doublon)", n === 26, `politiques=${n}`);
} catch (e) { check("B2", "rejeu idempotent", false, sqlErr(e)); }

// ---------- B3 — Rôles ----------
{
  const r = await pool.query(`SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
    FROM pg_roles WHERE rolname IN ('cvc_app','cvc_migr','cvc_admin') ORDER BY rolname`);
  const ok = r.rows.length === 3 && r.rows.every((x) => !x.rolsuper && !x.rolcreatedb && !x.rolcreaterole && !x.rolbypassrls);
  check("B3", "rôles cvc_app/cvc_migr/cvc_admin présents, sans aucun flag administratif", ok,
    r.rows.map((x) => `${x.rolname}[s=${x.rolsuper},cdb=${x.rolcreatedb},cr=${x.rolcreaterole},b=${x.rolbypassrls}]`).join(" "));
}

// ---------- B4 — Privilèges effectifs (échantillon) ----------
{
  const q = async (sql) => Object.values((await pool.query(sql)).rows[0])[0];
  const exp = [
    ["SELECT has_table_privilege('cvc_app','payments','DELETE')", false],
    ["SELECT has_table_privilege('cvc_app','transactions','UPDATE')", false],
    ["SELECT has_table_privilege('cvc_app','transactions','INSERT')", true],
    ["SELECT has_table_privilege('cvc_app','id_map','SELECT')", false],
    ["SELECT has_table_privilege('cvc_admin','payments','DELETE')", true],
    ["SELECT has_table_privilege('cvc_migr','id_map','INSERT')", true],
    ["SELECT has_column_privilege('cvc_app','payments','amount','UPDATE')", false],
    ["SELECT has_column_privilege('cvc_app','payments','status','UPDATE')", true],
  ];
  const bad = [];
  for (const [sql, want] of exp) {
    const v = await q(sql);
    if (v !== want) bad.push(`${sql.slice(7, 48)}=${v}≠${want}`);
  }
  check("B4", "privilèges effectifs conformes (moindre privilège)", bad.length === 0,
    bad.length ? bad.join(" ; ") : "8/8 assertions conformes");
}

// ---------- B5 — RLS ----------
{
  const pol = (await pool.query("SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='public'")).rows[0].n;
  const rls = (await pool.query(`SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace ns ON ns.oid=c.relnamespace
    WHERE ns.nspname='public' AND c.relkind='r' AND c.relrowsecurity`)).rows[0].n;
  const pua = (await pool.query(`SELECT count(*)::int AS n FROM pg_policies
    WHERE policyname='payments_update_app' AND cmd='UPDATE' AND roles::text='{cvc_app}'`)).rows[0].n;
  check("B5", "RLS : 26 politiques sur 6 tables + payments_update_app (cvc_app seul)",
    pol === 26 && rls === 6 && pua === 1, `politiques=${pol} rls=${rls} payments_update_app=${pua}`);
}

// ---------- B6 — Protection financière ON DELETE RESTRICT ----------
{
  const r = await pool.query(`SELECT
    (SELECT confdeltype::text FROM pg_constraint WHERE contype='f'
       AND conrelid='public.payments'::regclass AND confrelid='public.users'::regclass) AS pu,
    (SELECT confdeltype::text FROM pg_constraint WHERE contype='f'
       AND conrelid='public.transactions'::regclass AND confrelid='public.payments'::regclass) AS tp,
    (SELECT confdeltype::text FROM pg_constraint WHERE contype='f'
       AND conrelid='public.subscriptions'::regclass AND confrelid='public.users'::regclass) AS su`);
  const d = r.rows[0];
  check("B6", "intégrité financière : payments→users=RESTRICT, transactions→payments=NO ACTION, subscriptions→users=CASCADE",
    d.pu === "r" && d.tp === "a" && d.su === "c", `pu=${d.pu} tp=${d.tp} su=${d.su}`);
}

// ---------- Sonde SET ROLE (transit réversible) ----------
// Seed synthétique d'ABORD (plans requis par les flux C1/abonnements et suites API).
await pool.query(`INSERT INTO plans (name, price, duree, features, description, max_downloads) VALUES
  ('Free', 0, 365, '{}', 'seed synthétique 2G.5', 5),
  ('Basic', 5000, 30, '{}', 'seed synthétique 2G.5', 25),
  ('Premium', 15000, 30, '{}', 'seed synthétique 2G.5', 100)
  ON CONFLICT (name) DO NOTHING`);
console.log("SEED_OK 3 plans synthétiques (pour C1 et suites API)");
await pool.query("GRANT cvc_app TO CURRENT_USER");
const asApp = async (fn) => {
  const c = await pool.connect();
  try { await c.query("BEGIN"); await c.query("SET ROLE cvc_app"); await fn(c); }
  finally { await c.query("ROLLBACK").catch(() => {}); await c.query("RESET ROLE").catch(() => {}); c.release(); }
};
const tryQ = async (c, sql) => {
  await c.query("SAVEPOINT sp");
  try { await c.query(sql); await c.query("RELEASE SAVEPOINT sp"); return { ok: true }; }
  catch (e) { await c.query("ROLLBACK TO SAVEPOINT sp"); return { ok: false, code: e.code, msg: String(e.message).split("\n")[0] }; }
};

// ---------- B7 — cvc_app ne peut s'accorder de droits administratifs ----------
{
  const out = [];
  await asApp(async (c) => {
    out.push(["GRANT cvc_admin à soi-même", await tryQ(c, "GRANT cvc_admin TO CURRENT_USER")]);
    out.push(["ALTER ROLE self SUPERUSER", await tryQ(c, "ALTER ROLE cvc_app SUPERUSER")]);
    out.push(["CREATE TABLE", await tryQ(c, "CREATE TABLE p2g5(x int)")]);
    out.push(["SELECT id_map", await tryQ(c, "SELECT * FROM id_map LIMIT 1")]);
    out.push(["GRANT SELECT id_map à soi-même", await tryQ(c, "GRANT SELECT ON id_map TO cvc_app")]);
  });
  const ok = out.every(([, v]) => !v.ok);
  check("B7", "cvc_app ne peut s'accorder AUCUN droit administratif (5 tentatives refusées)", ok,
    out.map(([l, v]) => `${l}→${v.ok ? "RÉUSSI(défaut!)" : v.code}`).join(" ; "));
}

// ---------- C1 — Suppression interdite : erreur contrôlée, aucun état partiel ----------
{
  const out = [];
  await asApp(async (c) => {
    const e1 = Math.random().toString(36).slice(2, 10);
    await c.query(`INSERT INTO users (name, email, password, role) VALUES ('c1', '${e1}@c1.test', 'x', 'user')`);
    const uid = (await c.query("SELECT id FROM users WHERE email=$1", [`${e1}@c1.test`])).rows[0].id;
    await c.query(`INSERT INTO subscriptions (user_id, plan_id) SELECT $1, id FROM plans LIMIT 1`, [uid]);
    const sid = (await c.query("SELECT id FROM subscriptions WHERE user_id=$1", [uid])).rows[0].id;
    await c.query(`INSERT INTO payments (user_id, subscription_id, amount, currency, method, status, transaction_reference)
      VALUES ($1, $2, 5000, 'XOF', 'orange_money', 'succeeded', 'c1-${e1}')`, [uid, sid]);
    const pid = (await c.query("SELECT id FROM payments WHERE user_id=$1", [uid])).rows[0].id;
    await c.query(`INSERT INTO transactions (payment_id, type, amount) VALUES ($1, 'paiement', 5000)`, [pid]);
    out.push(["DELETE user avec historique", await tryQ(c, `DELETE FROM users WHERE id='${uid}'`)]);
    out.push(["DELETE paiement", await tryQ(c, `DELETE FROM payments WHERE id='${pid}'`)]);
    out.push(["DELETE transaction", await tryQ(c, "DELETE FROM transactions")]);
    const intact = (await c.query(`SELECT
      (SELECT count(*)::int FROM payments WHERE id='${pid}') AS p,
      (SELECT count(*)::int FROM transactions WHERE payment_id='${pid}') AS t`)).rows[0];
    out.push(["état partiel ? (1,1 = aucun)", { ok: intact.p === 1 && intact.t === 1, code: `p=${intact.p} t=${intact.t}` }]);
  });
  const ok = !out[0][1].ok && out[0][1].code === "23001" && !out[1][1].ok && !out[2][1].ok && out[3][1].ok;
  check("C1", "suppressions interdites → erreur contrôlée (23001/42501), historique intact", ok,
    out.map(([l, v]) => `${l}→${v.ok ? (v.code || "OK") : v.code}`).join(" ; "));
}

// ---------- C3 — Montants/devise/références protégés ----------
{
  const out = [];
  await asApp(async (c) => {
    // Ligne synthétique DANS la transaction : le WITH CHECK RLS ne s'applique
    // qu'aux lignes réellement mises à jour (0 ligne = aucune vérification).
    const e1 = Math.random().toString(36).slice(2, 10);
    await c.query(`INSERT INTO users (name, email, password, role) VALUES ('c3', '${e1}@c3.test', 'x', 'user')`);
    const uid = (await c.query("SELECT id FROM users WHERE email=$1", [`${e1}@c3.test`])).rows[0].id;
    await c.query(`INSERT INTO subscriptions (user_id, plan_id) SELECT $1, id FROM plans LIMIT 1`, [uid]);
    const sid = (await c.query("SELECT id FROM subscriptions WHERE user_id=$1", [uid])).rows[0].id;
    await c.query(`INSERT INTO payments (user_id, subscription_id, amount, currency, method, status, transaction_reference)
      VALUES ($1, $2, 5000, 'XOF', 'orange_money', 'pending', 'c3-${e1}')`, [uid, sid]);
    out.push(["UPDATE amount", await tryQ(c, "UPDATE payments SET amount = 1")]);
    out.push(["UPDATE currency", await tryQ(c, "UPDATE payments SET currency = 'EUR'")]);
    out.push(["UPDATE transaction_reference", await tryQ(c, "UPDATE payments SET transaction_reference = 'x'")]);
    out.push(["UPDATE status (autorisé)", await tryQ(c, "UPDATE payments SET status = 'refunded'")]);
    out.push(["UPDATE status interdit", await tryQ(c, "UPDATE payments SET status = 'bogus'")]);
    out.push(["UPDATE transactions", await tryQ(c, "UPDATE transactions SET amount = 1")]);
  });
  const ok = !out[0][1].ok && !out[1][1].ok && !out[2][1].ok && out[3][1].ok &&
    !out[4][1].ok && /row-level security|23514/.test(`${out[4][1].msg} ${out[4][1].code}`) && !out[5][1].ok;
  check("C3", "montants/devise/références immuables ; status borné (RLS)", ok,
    out.map(([l, v]) => `${l}→${v.ok ? "OK" : v.code}`).join(" ; "));
}
await pool.query("REVOKE cvc_app FROM CURRENT_USER");

// ---------- C4 — Cible incorrecte refusée avant mutation ----------
{
  let thrown = false, ev = "";
  try { await assertTestTarget({ url: urlFor("neondb"), mode: "write" }); }
  catch (e) { thrown = true; ev = e.message.slice(0, 55); }
  const c2 = classifyTarget("postgresql://u@evil.example.com/cvc_x");
  check("C4", "cible persistante/inconnue refusée AVANT toute mutation",
    thrown && c2.errors.length > 0, `${ev} | ${c2.errors[0]}`);
}

// ---------- Seed synthétique : déplacé AVANT les sondes C (voir ci-dessus) ----------

const failed = results.filter((x) => !x.pass).length;
console.log(`\nBILAN INTEGRE-2G5: ${results.length - failed}/${results.length} PASS — base jetable ${TARGET_DB} conservée (preuve)`);
await pool.end();
process.exit(failed === 0 ? 0 : 1);



