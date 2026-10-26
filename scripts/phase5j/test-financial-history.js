#!/usr/bin/env node
/**
 * Lot 2G.4A.2 — tests SQL de la protection de l'historique financier (12 scénarios).
 * EXÉCUTION OBLIGATOIRE sur la base jetable dédiée : le script REFUSE toute autre
 * base. Fixtures synthétiques uniques, chaque scénario en transaction ROLLBACK
 * = zéro résidu. Tentatives DIRECTES en SQL (indépendantes de l'application).
 * Usage : DATABASE_URL=<jetable> node scripts/phase5j/test-financial-history.js
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../Backend/package.json"));
const pg = require("pg");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: true } : undefined,
  max: 1,
  connectionTimeoutMillis: 60_000,
});

let failures = 0;
const check = (n, ok, d) => { if (!ok) failures++; console.log(`${ok ? "PASS" : "FAIL"} | ${n} | ${d}`); };

// ---------- Identité OBLIGATOIRE avant toute opération ----------
{
  const { rows: [id] } = await pool.query(
    "SELECT current_database() AS db, current_user AS usr, current_setting('neon.branch_id', true) AS br");
  if (id.db !== "cvc_finprotect_2g4a2") {
    console.error(`IDENTITE_REFUSEE base=${id.db} — seule cvc_finprotect_2g4a2 est autorisée`);
    process.exit(1);
  }
  console.log(`IDENTITE_OK base=${id.db} user=${id.usr} branche=${id.br}`);
}

const S = "finprot";
async function withRollback(fn) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await fn(c);
  } finally {
    await c.query("ROLLBACK");
    c.release();
  }
}
async function mkUser(c, tag) {
  const { rows: [u] } = await c.query(
    "INSERT INTO users (name,email,password,role) VALUES ($1,$2,'x','user') RETURNING id",
    [`${S} ${tag}`, `${S}-${tag}-${Date.now().toString(36)}@test.local`]);
  return u.id;
}
async function mkSub(c, uid) {
  // Base jetable = schéma seul : la fixture crée le plan Free si absent
  // (données synthétiques autorisées, ON CONFLICT = idempotent).
  await c.query(
    "INSERT INTO plans (name,price,duree,features,description,is_popular,max_downloads) VALUES ('Free',0,365,'{}','finprot',false,5) ON CONFLICT (name) DO NOTHING");
  const { rows: [p] } = await c.query("SELECT id FROM plans WHERE name='Free'");
  const { rows: [s] } = await c.query(
    "INSERT INTO subscriptions (user_id,plan_id,start_date,end_date,status,auto_renew) VALUES ($1,$2,now(),now()+interval '1 day','active',false) RETURNING id",
    [uid, p.id]);
  return s.id;
}
async function mkPayment(c, uid, sid, tag) {
  const { rows: [p] } = await c.query(
    "INSERT INTO payments (user_id,subscription_id,amount,currency,method,status,transaction_reference) VALUES ($1,$2,1,'XOF','wave','succeeded',$3) RETURNING id",
    [uid, sid, `${S}-ref-${tag}-${Date.now().toString(36)}`]);
  return p.id;
}
async function mkTx(c, payId) {
  const { rows: [t] } = await c.query(
    "INSERT INTO transactions (payment_id,type,amount,description) VALUES ($1,'paiement',1,'finprot') RETURNING id", [payId]);
  return t.id;
}
const del = (c, table, id) => c.query(`DELETE FROM ${table} WHERE id=$1`, [id]);

// ================= T1-T4 : suppressions en SQL DIRECT =================
{
  await withRollback(async (c) => {
    const uid = await mkUser(c, "t1");
    const { rowCount } = await del(c, "users", uid);
    check("T1 utilisateur sans données financières → DELETE SQL accepté", rowCount === 1, `rowCount=${rowCount}`);
  });

  await withRollback(async (c) => {
    const uid = await mkUser(c, "t2");
    const sid = await mkSub(c, uid);
    await mkPayment(c, uid, sid, "t2");
    let code = null;
    try { await del(c, "users", uid); } catch (e) { code = e.code; }
    // RESTRICT lève 23001 (restrict_violation) — NO ACTION lèverait 23503.
    check("T2 utilisateur AVEC paiement → DELETE SQL REFUSÉ (FK RESTRICT)", code === "23001", `code=${code}`);
  });

  await withRollback(async (c) => {
    const uid = await mkUser(c, "t3");
    const sid = await mkSub(c, uid);
    const pid = await mkPayment(c, uid, sid, "t3");
    await mkTx(c, pid);
    let code = null;
    try { await del(c, "users", uid); } catch (e) { code = e.code; }
    check("T3 utilisateur AVEC paiement+transaction → DELETE SQL REFUSÉ", code === "23001", `code=${code}`);
  });

  await withRollback(async (c) => {
    const uid = await mkUser(c, "t4");
    const sid = await mkSub(c, uid);
    const pid = await mkPayment(c, uid, sid, "t4");
    await mkTx(c, pid);
    let code = null;
    try { await del(c, "payments", pid); } catch (e) { code = e.code; }
    check("T4 paiement référencé par transaction → DELETE SQL REFUSÉ (NO ACTION)", code === "23503", `code=${code}`);
  });
}
// ================= T5-T8 : intégrité après refus =================
{
  await withRollback(async (c) => {
    const uid = await mkUser(c, "t5");
    const sid = await mkSub(c, uid);
    const pid = await mkPayment(c, uid, sid, "t5");
    const tid = await mkTx(c, pid);
    const before = await c.query(
      "SELECT (SELECT count(*)::int FROM users WHERE id=$1) u,(SELECT count(*)::int FROM payments WHERE user_id=$1) p,(SELECT count(*)::int FROM transactions WHERE payment_id=$2) t", [uid, pid]);
    await c.query("SAVEPOINT avant_refus");
    try { await del(c, "users", uid); } catch { await c.query("ROLLBACK TO SAVEPOINT avant_refus"); }
    const after = await c.query(
      "SELECT (SELECT count(*)::int FROM users WHERE id=$1) u,(SELECT count(*)::int FROM payments WHERE user_id=$1) p,(SELECT count(*)::int FROM transactions WHERE payment_id=$2) t", [uid, pid]);
    const b = before.rows[0], a = after.rows[0];
    check("T5 refus de suppression → aucune modification partielle (compteurs identiques)",
      b.u === a.u && b.p === a.p && b.t === a.t, `avant=${b.u}/${b.p}/${b.t} après=${a.u}/${a.p}/${a.t}`);
    check("T6 paiements présents après refus de suppression de l'utilisateur", a.p === 1, `p=${a.p}`);
    check("T7 transactions présentes après refus", a.t === 1 && tid !== null, `t=${a.t}`);
  });

  await withRollback(async (c) => {
    const { rows: [orph] } = await c.query(
      `SELECT ((SELECT count(*) FROM payments p LEFT JOIN users u ON u.id=p.user_id WHERE u.id IS NULL)
            + (SELECT count(*) FROM transactions t LEFT JOIN payments p ON p.id=t.payment_id WHERE p.id IS NULL))::int AS n`);
    const { rows: [{ n: fk }] } = await c.query("SELECT count(*)::int AS n FROM pg_constraint WHERE contype='f'");
    check("T8 clés étrangères valides : 0 orphelin, 5 FK présentes", orph.n === 0 && fk === 5, `orphelins=${orph.n} fk=${fk}`);
  });
}

// ================= T9 : abonnements inchangés =================
{
  await withRollback(async (c) => {
    const uid = await mkUser(c, "t9");
    await mkSub(c, uid);
    const { rowCount } = await del(c, "users", uid);
    const { rows: [{ n }] } = await c.query("SELECT count(*)::int AS n FROM subscriptions WHERE user_id=$1", [uid]);
    check("T9 user + abonnement seul → suppression OK, abonnement purgé par CASCADE (inchangé)",
      rowCount === 1 && n === 0, `deleted=${rowCount} subs_restantes=${n}`);
  });
}

// ================= T10 : droits des rôles =================
{
  const { rows } = await pool.query(
    "SELECT rolname, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname IN ('cvc_app','cvc_admin','cvc_migr') ORDER BY rolname");
  const ok = rows.length === 3 && rows.every((r) => !r.rolsuper && !r.rolbypassrls && !r.rolcreatedb && !r.rolcreaterole);
  check("T10 droits des rôles inchangés (moindre privilège : attributs dangereux = false)", ok, `roles=${rows.map((r) => r.rolname).join(",")}`);
}

// ================= T11 : règles ON DELETE effectives exactes =================
{
  const { rows } = await pool.query(
    `SELECT c.conrelid::regclass::text||'→'||c.confrelid::regclass::text AS rel, c.confdeltype
       FROM pg_constraint c WHERE c.contype='f' ORDER BY 1`);
  const map = Object.fromEntries(rows.map((r) => [r.rel, r.confdeltype]));
  check("T11 règles ON DELETE exactes (payments→users=r, transactions→payments=a, subscriptions→users=c)",
    map["payments→users"] === "r" && map["transactions→payments"] === "a" && map["subscriptions→users"] === "c",
    `payments→users=${map["payments→users"]} transactions→payments=${map["transactions→payments"]} subscriptions→users=${map["subscriptions→users"]}`);
}

// ================= T12 : migration réappliquée = idempotente =================
// Exécutée HORS transaction interne : le fichier porte son propre BEGIN/COMMIT ;
// une double application RÉELLE est la preuve d'idempotence (aucune fixture ici).
{
  const fs = await import("node:fs");
  const sql = fs.readFileSync(path.join(here, "../../Backend/db/schema/002_financial_history_protection.sql"), "utf8");
  let err1 = null, err2 = null;
  try { await pool.query(sql); } catch (e) { err1 = e.message; }
  try { await pool.query(sql); } catch (e) { err2 = e.message; }
  const { rows: [{ del }] } = await pool.query(
    "SELECT confdeltype AS del FROM pg_constraint WHERE contype='f' AND conrelid='public.payments'::regclass AND confrelid='public.users'::regclass");
  check("T12 migration réappliquée (2× RÉEL) sans erreur ni double effet (idempotence)",
    !err1 && !err2 && del === "r", `run1=${err1 || "OK"} run2=${err2 || "OK"} del=${del}`);
}

await pool.end();
console.log(failures === 0 ? "\nBILAN FINANCIAL-PROTECTION: TOUS PASS" : `\nBILAN FINANCIAL-PROTECTION: ${failures} FAIL`);
process.exit(failures > 0 ? 1 : 0);

