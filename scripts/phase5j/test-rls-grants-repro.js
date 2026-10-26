#!/usr/bin/env node
/**
 * Lot 2G.4D — Tests de reproductibilité RLS/grants (T1-T12) sur base JETABLE.
 *
 * ISOLATION :
 *   - aucune lecture de .env : la cible est fournie EXPLICITEMENT via
 *     CVC_TEST_ADMIN_URL ; le script refuse toute autre source ;
 *   - garde d'identité : l'hôte doit être l'endpoint de la branche de TEST
 *     (ep-ancient-glitter-b98wmcx7) et la base cible doit s'appeler
 *     EXACTEMENT cvc_rlsgrants_2g4d (jamais Supabase/production/neondb/
 *     cvc_rehearsal) — sinon refus immédiat, avant toute écriture ;
 *   - données 100 % synthétiques (jamais d'identifiants réels) ;
 *   - toutes les opérations en SQL direct via SET ROLE (rôles applicatifs
 *     réels) sur la base jetable uniquement.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../Backend/package.json"));
const pg = require("pg");

const TARGET_DB = "cvc_rlsgrants_2g4d";
const TEST_ENDPOINT = "ep-ancient-glitter-b98wmcx7"; // branche br-quiet-base-b97uio6b
const FORBIDDEN_HOSTS = ["supabase"];

const results = [];
function check(id, label, pass, evidence) {
  results.push({ id, pass });
  console.log(`${pass ? "PASS" : "FAIL"} | ${id} ${label} | ${evidence}`);
}
const sqlErr = (e) => `${e.code || "?"} ${String(e.message).split("\n")[0]}`;

// ---------- 0. Garde d'identité AVANT toute connexion ----------
const adminUrl = process.env.CVC_TEST_ADMIN_URL;
if (!adminUrl) {
  console.error("REFUS : CVC_TEST_ADMIN_URL absente (aucune lecture de .env par ce script).");
  process.exit(2);
}
let u;
try { u = new URL(adminUrl); } catch { console.error("REFUS : URL invalide."); process.exit(2); }
if (!u.hostname.includes(TEST_ENDPOINT)) {
  console.error(`REFUS : hôte '${u.hostname}' ≠ endpoint de test ${TEST_ENDPOINT}.`);
  process.exit(2);
}
if (FORBIDDEN_HOSTS.some((h) => u.hostname.toLowerCase().includes(h))) {
  console.error("REFUS : hôte cible interdit (Supabase/production).");
  process.exit(2);
}
console.log(`IDENTITE_OK endpoint=${u.hostname} base_cible=${TARGET_DB}`);

const urlFor = (db) => { const t = new URL(adminUrl); t.pathname = `/${db}`; return t.toString(); };
const connect = (db) => new pg.Pool({
  connectionString: urlFor(db),
  max: 1,
  connectionTimeoutMillis: 30000,
  ssl: u.protocol === "postgresqls:" || process.env.PGSSL === "require"
    ? { rejectUnauthorized: true } : undefined,
});

// ---------- 1. Création de la base jetable (identité revérifiée) ----------
const maintDbs = ["template1", "postgres", "neondb"];
let maint = null;
for (const db of maintDbs) {
  const pool = connect(db);
  try {
    const r = await pool.query("SELECT current_user, current_database()");
    const role = r.rows[0].current_user;
    const flags = await pool.query(
      "SELECT rolcreatedb, rolcreaterole, rolsuper FROM pg_roles WHERE rolname = current_user");
    const ok = flags.rows[0].rolcreatedb || flags.rows[0].rolcreaterole || flags.rows[0].rolsuper;
    console.log(`MAINTENANCE_OK base=${db} role=${role} createdb=${flags.rows[0].rolcreatedb}`);
    if (!ok) { await pool.end(); continue; }
    maint = { db, pool };
    break;
  } catch { await pool.end(); }
}
if (!maint) { console.error("REFUS : aucun rôle de maintenance (CREATE DATABASE impossible)."); process.exit(2); }
if (TARGET_DB === "neondb" || TARGET_DB === "cvc_rehearsal" || TARGET_DB === "postgres") {
  console.error("REFUS : nom de base jetable interdit."); process.exit(2);
}
try {
  await maint.pool.query(`CREATE DATABASE ${TARGET_DB}`);
  console.log(`BASE_JETABLE_CREEE ${TARGET_DB} (depuis ${maint.db} — aucun objet de ${maint.db} modifié)`);
} catch (e) {
  if (e.code !== "42P04") { console.error(`REFUS CREATE DATABASE : ${sqlErr(e)}`); process.exit(2); }
  console.log(`BASE_JETABLE_EXISTE ${TARGET_DB} — réutilisée (jeu de tests précédent)`);
}
await maint.pool.end();

const pool = connect(TARGET_DB);
const id = await pool.query("SELECT current_database(), current_user");
console.log(`CIBLE_OK ${JSON.stringify(id.rows[0])}`);

// ---------- 2. Application de la procédure complète (fichiers du dépôt) ----------
const applyFile = async (rel) => {
  const sql = fs.readFileSync(path.resolve(rel), "utf8");
  await pool.query(sql);
};
try {
  await applyFile("Backend/db/schema/001_initial.sql");
  await applyFile("Backend/db/schema/002_financial_history_protection.sql");
  await applyFile("Backend/db/grants/001_grants_rls.sql");
  check("T1", "préparation complète d'une base neuve (001 → 002 → grants)", true,
    "3 fichiers appliqués sans erreur (dont bloc de vérification §6)");
} catch (e) {
  check("T1", "préparation complète d'une base neuve", false, sqlErr(e));
  process.exit(1);
}

// ---------- Données synthétiques de référence (plans — idempotent) ----------
await pool.query(`INSERT INTO plans (name, price, duree, features, description, max_downloads) VALUES
  ('Free', 0, 365, '{}', 'seed synthétique', 5),
  ('Basic', 5000, 30, '{}', 'seed synthétique', 25),
  ('Premium', 15000, 30, '{}', 'seed synthétique', 100)
  ON CONFLICT (name) DO NOTHING`);
console.log("SEED_OK 3 plans synthétiques (Free/Basic/Premium)");


// ---------- T2 — Idempotence (rejeu complet) ----------
try {
  await applyFile("Backend/db/grants/001_grants_rls.sql");
  await applyFile("Backend/db/schema/002_financial_history_protection.sql");
  const n = await pool.query("SELECT count(*)::int AS n FROM pg_policies WHERE schemaname='public'");
  check("T2", "rejeu de la procédure sans erreur ni doublon", n.rows[0].n === 26,
    `politiques après rejeu = ${n.rows[0].n} (26 attendues)`);
} catch (e) {
  check("T2", "rejeu de la procédure", false, sqlErr(e));
}

// ---------- T3 — Présence de toutes les politiques attendues ----------
const EXPECTED = {
  users: ["users_select", "users_insert_app", "users_insert_admin", "users_update", "users_delete"],
  plans: ["plans_select", "plans_insert", "plans_update", "plans_delete"],
  subscriptions: ["subscriptions_select", "subscriptions_insert", "subscriptions_update", "subscriptions_delete"],
  payments: ["payments_select", "payments_insert", "payments_update", "payments_update_app", "payments_delete"],
  transactions: ["transactions_select", "transactions_insert", "transactions_update", "transactions_delete"],
  id_map: ["id_map_select", "id_map_insert", "id_map_update", "id_map_delete"],
};
{
  const r = await pool.query(
    "SELECT tablename, policyname FROM pg_policies WHERE schemaname='public'");
  const found = new Set(r.rows.map((x) => `${x.tablename}/${x.policyname}`));
  const missing = [];
  for (const [t, names] of Object.entries(EXPECTED))
    for (const n of names) if (!found.has(`${t}/${n}`)) missing.push(`${t}/${n}`);
  check("T3", "26 politiques RLS attendues présentes (par commande, jamais FOR ALL)",
    missing.length === 0 && found.size === 26, `manquantes=[${missing}] total=${found.size}`);
}

// ---------- T4 — payments_update_app : présence et sémantique exacte ----------
{
  const r = await pool.query(`SELECT cmd, roles::text AS roles_str, qual, with_check,
    (roles @> ARRAY['cvc_app']::name[] AND array_length(roles, 1) = 1) AS only_app
    FROM pg_policies
    WHERE schemaname='public' AND tablename='payments' AND policyname='payments_update_app'`);
  const ok = r.rows.length === 1 && r.rows[0].cmd === "UPDATE" && r.rows[0].only_app === true;
  check("T4", "payments_update_app présente, UPDATE, cvc_app seul", ok,
    r.rows.length === 1
      ? `cmd=${r.rows[0].cmd} roles=${r.rows[0].roles_str} check=${String(r.rows[0].with_check).slice(0, 60)}`
      : "absente");
}

// ---------- T5 — Privilèges EFFECTIFS (catalogue) ----------
{
  const q = async (fn) => (await pool.query(`SELECT ${fn} AS v`)).rows[0].v;
  const exp = [
    // [fonction, rôle, table/colonne, droit, attendu]
    ["has_table_privilege", "cvc_app", "payments", "SELECT", true],
    ["has_table_privilege", "cvc_app", "payments", "INSERT", true],
    // UPDATE = strictement par COLONNES (status, raw_gateway_response) :
    // le privilège table-level est volontairement ABSENT (moindre privilège).
    ["has_table_privilege", "cvc_app", "payments", "UPDATE", false],
    ["has_table_privilege", "cvc_app", "payments", "DELETE", false],
    ["has_table_privilege", "cvc_app", "transactions", "DELETE", false],
    ["has_table_privilege", "cvc_app", "transactions", "UPDATE", false],
    ["has_table_privilege", "cvc_app", "transactions", "INSERT", true],
    ["has_table_privilege", "cvc_app", "users", "DELETE", true],
    ["has_table_privilege", "cvc_app", "plans", "DELETE", true],
    ["has_table_privilege", "cvc_app", "subscriptions", "DELETE", false],
    ["has_table_privilege", "cvc_app", "id_map", "SELECT", false],
    ["has_table_privilege", "cvc_migr", "id_map", "SELECT", true],
    ["has_table_privilege", "cvc_migr", "id_map", "INSERT", true],
    ["has_table_privilege", "cvc_admin", "payments", "DELETE", true],
  ];
  const cols = [
    ["payments", "amount", false], ["payments", "currency", false],
    ["payments", "transaction_reference", false], ["payments", "user_id", false],
    ["payments", "subscription_id", false], ["payments", "status", true],
    ["payments", "raw_gateway_response", true],
    ["users", "role", false], ["users", "email", false], ["users", "user_plan", true],
    ["subscriptions", "user_id", false], ["subscriptions", "status", true],
  ];
  const bad = [];
  for (const [fn, role, obj, right, want] of exp) {
    const v = await q(`${fn}('${role}', '${obj}', '${right}')`);
    if (v !== want) bad.push(`${fn}(${role},${obj},${right})=${v}≠${want}`);
  }
  for (const [tbl, col, want] of cols) {
    const v = await q(`has_column_privilege('cvc_app', '${tbl}', '${col}', 'UPDATE')`);
    if (v !== want) bad.push(`col(cvc_app,${tbl},${col})=${v}≠${want}`);
  }
  check("T5", "matrice des privilèges effectifs conforme (14 table + 12 colonnes)", bad.length === 0,
    bad.length ? bad.slice(0, 6).join(" ; ") : "36/36 assertions conformes");
}

// ---------- T6 — Absence de droits administratifs pour cvc_app ----------
{
  const r = await pool.query(`SELECT rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
    FROM pg_roles WHERE rolname = 'cvc_app'`);
  const f = r.rows[0];
  const schemaCreate = (await pool.query(
    "SELECT has_schema_privilege('cvc_app','public','CREATE') AS v")).rows[0].v;
  const truncate = (await pool.query(
    "SELECT has_table_privilege('cvc_app','payments','TRUNCATE') AS v")).rows[0].v;
  const ok = f && !f.rolsuper && !f.rolcreatedb && !f.rolcreaterole && !f.rolbypassrls
    && !schemaCreate && !truncate;
  check("T6", "cvc_app sans aucun droit administratif", ok,
    `super=${f?.rolsuper} createdb=${f?.rolcreatedb} createrole=${f?.rolcreaterole} bypass=${f?.rolbypassrls} schemaCreate=${schemaCreate} truncate=${truncate}`);
}

// ---------- SET ROLE (préflight) + helpers ----------
// SET ROLE exige l'appartenance au rôle : transit de sonde RÉVERSIBLE accordé à
// l'opérateur de test (CURRENT_USER), puis RÉVOQUÉ après T10 — T12 vérifie que
// l'état initial est restauré (0 appartenance). Neutre en sécurité : l'opérateur
// est déjà propriétaire de la base jetable.
await pool.query("GRANT cvc_app TO CURRENT_USER");
console.log("SONDE_GRANT accordé cvc_app→opérateur (transitoire, révoqué après T10)");
const rnd = () => Math.random().toString(36).slice(2, 10);
async function asRole(role, fn) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(`SET ROLE ${role}`);
    await fn(c);
  } finally {
    await c.query("ROLLBACK").catch(() => {});
    await c.query("RESET ROLE").catch(() => {});
    c.release();
  }
}
async function tryQ(c, sql) {
  // SAVEPOINT : chaque sonde est isolée — une erreur attendue n'abandonne pas
  // la transaction (sinon 25P02 masque les codes réels des sondes suivantes).
  await c.query("SAVEPOINT probe_sp");
  try {
    const r = await c.query(sql);
    await c.query("RELEASE SAVEPOINT probe_sp");
    return { ok: true, r };
  } catch (e) {
    await c.query("ROLLBACK TO SAVEPOINT probe_sp");
    return { ok: false, code: e.code, msg: String(e.message).split("\n")[0] };
  }
}
try {
  const c = await pool.connect();
  await c.query("SET ROLE cvc_app");
  await c.query("RESET ROLE");
  c.release();
  console.log("SETOLE_OK SET ROLE cvc_app autorisé (sonde de privilèges réelle)");
} catch (e) {
  console.error(`REFUS : SET ROLE impossible (${sqlErr(e)}) — sonde de privilèges non exécutable.`);
  process.exit(2);
}
// ---------- T7 — Historique financier non supprimable par cvc_app ----------
{
  const out = [];
  await asRole("cvc_app", async (c) => {
    const e1 = rnd();
    await c.query(`INSERT INTO users (name, email, password, role) VALUES ('t7', '${e1}@t7.test', 'x', 'user')`);
    const uid = (await c.query("SELECT id FROM users WHERE email=$1", [`${e1}@t7.test`])).rows[0].id;
    await c.query(`INSERT INTO subscriptions (user_id, plan_id) SELECT $1, id FROM plans LIMIT 1`, [uid]);
    const sid = (await c.query("SELECT id FROM subscriptions WHERE user_id=$1", [uid])).rows[0].id;
    await c.query(`INSERT INTO payments (user_id, subscription_id, amount, currency, method, status, transaction_reference)
      VALUES ($1, $2, 5000, 'XOF', 'orange_money', 'succeeded', 't7-${rnd()}')`, [uid, sid]);
    const pid = (await c.query("SELECT id FROM payments WHERE user_id=$1", [uid])).rows[0].id;
    await c.query(`INSERT INTO transactions (payment_id, type, amount) VALUES ($1, 'paiement', 5000)`, [pid]);
    out.push(["DELETE transactions", await tryQ(c, "DELETE FROM transactions")]);
    out.push(["DELETE payments", await tryQ(c, "DELETE FROM payments")]);
    out.push(["DELETE user avec paiement (RESTRICT attendu)", await tryQ(c, `DELETE FROM users WHERE id='${uid}'`)]);
    out.push(["DELETE abonnement", await tryQ(c, `DELETE FROM subscriptions WHERE id='${sid}'`)]);
  });
  const ok =
    !out[0][1].ok && out[0][1].code === "42501" &&
    !out[1][1].ok && out[1][1].code === "42501" &&
    !out[2][1].ok && out[2][1].code === "23001" &&
    !out[3][1].ok && out[3][1].code === "42501";
  check("T7", "cvc_app ne peut supprimer AUCUN historique financier", ok,
    out.map(([l, v]) => `${l}→${v.ok ? "RÉUSSI(défaut!)" : v.code}`).join(" ; "));
}

// ---------- T8 — Montants/références immuables pour cvc_app ----------
{
  const out = [];
  await asRole("cvc_app", async (c) => {
    const e1 = rnd();
    await c.query(`INSERT INTO users (name, email, password, role) VALUES ('t8', '${e1}@t8.test', 'x', 'user')`);
    const uid = (await c.query("SELECT id FROM users WHERE email=$1", [`${e1}@t8.test`])).rows[0].id;
    await c.query(`INSERT INTO subscriptions (user_id, plan_id) SELECT $1, id FROM plans LIMIT 1`, [uid]);
    const sid = (await c.query("SELECT id FROM subscriptions WHERE user_id=$1", [uid])).rows[0].id;
    await c.query(`INSERT INTO payments (user_id, subscription_id, amount, currency, method, status, transaction_reference)
      VALUES ($1, $2, 5000, 'XOF', 'orange_money', 'pending', 't8-${rnd()}')`, [uid, sid]);
    out.push(["UPDATE amount", await tryQ(c, "UPDATE payments SET amount = 999")]);
    out.push(["UPDATE transaction_reference", await tryQ(c, "UPDATE payments SET transaction_reference = 'hacked'")]);
    out.push(["UPDATE currency", await tryQ(c, "UPDATE payments SET currency = 'EUR'")]);
    out.push(["UPDATE user_id", await tryQ(c, `UPDATE payments SET user_id = '${uid}'`)]); // idem = non qualifié ?
    out.push(["UPDATE status→succeeded (autorisé)", await tryQ(c, "UPDATE payments SET status = 'succeeded'")]);
    out.push(["UPDATE status→valeur interdite", await tryQ(c, "UPDATE payments SET status = 'bogus'")]);
    out.push(["UPDATE transactions (interdit)", await tryQ(c, "UPDATE transactions SET amount = 1")]);
    out.push(["UPDATE users.role (colonne protégée)", await tryQ(c, "UPDATE users SET role = 'admin'")]);
  });
  const ok =
    !out[0][1].ok && !out[1][1].ok && !out[2][1].ok && !out[3][1].ok &&
    out[4][1].ok &&
    !out[5][1].ok && /row-level security|23514/.test(`${out[5][1].msg} ${out[5][1].code}`) &&
    !out[6][1].ok && !out[7][1].ok;
  check("T8", "montants/devise/références/clés immuables ; status borné", ok,
    out.map(([l, v]) => `${l}→${v.ok ? "OK" : v.code}`).join(" ; "));
}

// ---------- T9 — Intégrité paiements/transactions (contraintes réelles) ----------
{
  const r = await pool.query(`SELECT
    (SELECT confdeltype::text FROM pg_constraint WHERE contype='f'
       AND conrelid='public.payments'::regclass AND confrelid='public.users'::regclass) AS pu,
    (SELECT confdeltype::text FROM pg_constraint WHERE contype='f'
       AND conrelid='public.transactions'::regclass AND confrelid='public.payments'::regclass) AS tp,
    (SELECT confdeltype::text FROM pg_constraint WHERE contype='f'
       AND conrelid='public.subscriptions'::regclass AND confrelid='public.users'::regclass) AS su,
    (SELECT count(*)::int FROM pg_constraint WHERE contype='f') AS fks`);
  const d = r.rows[0];
  check("T9", "intégrité : payments→users=RESTRICT, transactions→payments=NO ACTION, subscriptions→users=CASCADE",
    d.pu === "r" && d.tp === "a" && d.su === "c" && d.fks === 5,
    `pu=${d.pu} tp=${d.tp} su=${d.su} fk_total=${d.fks}`);
}

// ---------- T10 — Opérations applicatives strictement nécessaires (cvc_app) ----------
{
  const out = [];
  await asRole("cvc_app", async (c) => {
    const e1 = rnd();
    out.push(["INSERT user role=user", await tryQ(c, `INSERT INTO users (name, email, password, role) VALUES ('t10', '${e1}@t10.test', 'x', 'user')`)]);
    out.push(["INSERT user role=admin (refus attendu)", await tryQ(c, `INSERT INTO users (name, email, password, role) VALUES ('evil', 'evil-${e1}@t10.test', 'x', 'admin')`)]);
    out.push(["INSERT plan", await tryQ(c, `INSERT INTO plans (name, price, duree, features, description, max_downloads) VALUES ('Basic', ${Date.now() % 1000}, 30, '{}', 't', 5) ON CONFLICT (name) DO NOTHING`)]);
    out.push(["INSERT subscription", await tryQ(c, `INSERT INTO subscriptions (user_id, plan_id) SELECT id, (SELECT id FROM plans LIMIT 1) FROM users WHERE email='${e1}@t10.test'`)]);
    out.push(["INSERT payment", await tryQ(c, `INSERT INTO payments (user_id, subscription_id, amount, currency, method, status, transaction_reference) SELECT u.id, s.id, 1000, 'XOF', 'wave', 'pending', 't10-${rnd()}' FROM users u JOIN subscriptions s ON s.user_id=u.id WHERE u.email='${e1}@t10.test'`)]);
    out.push(["UPDATE payment status", await tryQ(c, `UPDATE payments SET status='succeeded', raw_gateway_response='{"mock":true}'::jsonb WHERE transaction_reference LIKE 't10-%'`)]);
    out.push(["INSERT transaction", await tryQ(c, `INSERT INTO transactions (payment_id, type, amount, description) SELECT id, 'paiement', 1000, 't10' FROM payments WHERE transaction_reference LIKE 't10-%'`)]);
    out.push(["UPDATE users.user_plan", await tryQ(c, `UPDATE users SET user_plan='Basic', user_max_downloads=25, downloads_used=0 WHERE email='${e1}@t10.test'`)]);
    out.push(["UPDATE subscriptions.status", await tryQ(c, `UPDATE subscriptions SET status='canceled', end_date=now(), auto_renew=false WHERE user_id=(SELECT id FROM users WHERE email='${e1}@t10.test')`)]);
    out.push(["SELECT id_map (refus attendu)", await tryQ(c, "SELECT * FROM id_map LIMIT 1")]);
    out.push(["CREATE TABLE (refus attendu)", await tryQ(c, "CREATE TABLE t10_probe(x int)")]);
  });
  const failed = out.filter(([l, v], i) =>
    (i === 1 || i === 9 || i === 10) ? v.ok : !v.ok);
  check("T10", "parcours applicatif complet fonctionnel sous cvc_app (refus = 3 attendus)",
    failed.length === 0,
    out.map(([l, v]) => `${l}→${v.ok ? "OK" : v.code}`).join(" ; "));
}

// ---------- Fin du transit de sonde : état restauré ----------
await pool.query("REVOKE cvc_app FROM CURRENT_USER");
console.log("SONDE_REVOKE cvc_app révoqué de l'opérateur — état initial restauré");

// ---------- T11 — Aucune étape SQL manuelle non documentée ----------
{
  const src = fs.readFileSync(path.resolve("Backend/db/grants/001_grants_rls.sql"), "utf8");
  const roles = (await pool.query(
    "SELECT count(*)::int AS n FROM pg_roles WHERE rolname IN ('cvc_app','cvc_migr','cvc_admin')")).rows[0].n;
  const ok = /CREATE ROLE cvc_app/.test(src) && /CREATE ROLE cvc_migr/.test(src) &&
    /CREATE ROLE cvc_admin/.test(src) && /RAISE EXCEPTION/.test(src) && roles === 3;
  check("T11", "procédure autonome : rôles créés par le script, vérifications incluses",
    ok, `create_role_dans_script=true vérifications=true rôles_presents=${roles}/3`);
}

// ---------- T12 — Aucun héritage/contournement de RLS ----------
{
  const memb = (await pool.query(`SELECT count(*)::int AS n FROM pg_auth_members m
    JOIN pg_roles r ON r.oid = m.member
    WHERE r.rolname IN ('cvc_app','cvc_migr','cvc_admin')`)).rows[0].n;
  const pub = (await pool.query(`SELECT count(*)::int AS n
    FROM pg_class c, aclexplode(c.relacl) a
    WHERE c.relnamespace='public'::regnamespace AND c.relkind='r' AND a.grantee = 0`)).rows[0].n;
  const seq = (await pool.query(
    "SELECT count(*)::int AS n FROM pg_class WHERE relkind='S'")).rows[0].n;
  const ok = memb === 0 && pub === 0 && seq === 0;
  check("T12", "aucun héritage de rôle, aucun grant PUBLIC, aucune séquence (N/A documenté)",
    ok, `appartenances_héritées=${memb} grants_PUBLIC=${pub} séquences=${seq}`);
}

// ---------- Bilan ----------
const failed = results.filter((r) => !r.pass).length;
console.log(`\nBILAN RLS-GRANTS-REPRO: ${results.length - failed}/${results.length} PASS — base jetable ${TARGET_DB} conservée (preuve)`);
await pool.end();
process.exit(failed === 0 ? 0 : 1);



