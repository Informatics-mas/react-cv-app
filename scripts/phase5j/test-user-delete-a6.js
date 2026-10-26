#!/usr/bin/env node
/**
 * Lot 2C — A6 : suppression d'utilisateur vs historique financier (environnement isolé).
 * 8 cas obligatoires (mandat Lot 2C §3) sur comptes de test `phase5c-*@test.local` :
 *   1. suppression sans données dépendantes            → 200 + disparition
 *   2. suppression avec abonnement                     → 200 + abonnement purgé (CASCADE)
 *   3. suppression avec payment + transaction          → 409 USER_HAS_FINANCIAL_HISTORY
 *   4. absence de perte financière après refus         → comptes inchangés
 *   5. réponse API cohérente, sans fuite interne       → code/message propres
 *   6. accès interdit à un utilisateur non autorisé    → 403 / 401
 *   7. non-régression comptes & abonnements            → plans/subscribe/me OK
 *   8. comportement transactionnel en cas d'échec      → aucun état partiel
 * Nettoyage : uniquement les comptes `phase5c-*@test.local` créés ici (identité vérifiée).
 * Usage : DATABASE_URL=<cvc_admin> node scripts/phase5j/test-user-delete-a6.js [PORT=5000]
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertTestTarget } from "../lib/safe-target.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../Backend/package.json"));
require("dotenv").config({ path: path.join(here, "../../Backend/.env") });
const pg = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const PORT = Number(process.argv[2] || 5000);
const API = `http://localhost:${PORT}/api`;
// Lot 2G.4F — cible EXPLICITE + identité réelle vérifiée avant toute écriture.
const targetUrl = process.env.CVC_TEST_DB_URL;
await assertTestTarget({ url: targetUrl, mode: "write" });

const pool = new pg.Pool({
  connectionString: targetUrl,
  ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: true } : undefined,
  max: 2,
  connectionTimeoutMillis: 60_000,
});

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | ${detail}`);
};
// Lot 2G.7 : tout JWT doit porter un `jti` avec session enregistrée (révocable).
const sign = async (id, role) => {
  const { randomUUID } = await import("node:crypto");
  const jti = randomUUID();
  await pool.query(
    "INSERT INTO user_sessions (jti, user_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')",
    [jti, id]);
  return jwt.sign({ id, role, jti }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

const createdEmails = [];
async function makeUser(tag) {
  const s = `${tag}-${Date.now().toString(36)}`;
  const email = `phase5c-${s}@test.local`;
  const hash = await bcrypt.hash("Phase5C!pass75", 10);
  const { rows: [u] } = await pool.query(
    `INSERT INTO users (name,email,password,role,user_plan,user_max_downloads,downloads_used)
     VALUES ($1,$2,$3,'user','Free',5,0) RETURNING id`,
    [`Phase5C ${s}`, email, hash]
  );
  createdEmails.push(email);
  return { id: u.id, email };
}
async function addSubscription(userId, planName = "Free") {
  const { rows: [{ id: planId }] } = await pool.query("SELECT id FROM plans WHERE name=$1", [planName]);
  const { rows: [{ id }] } = await pool.query(
    `INSERT INTO subscriptions (user_id,plan_id,start_date,end_date,status,auto_renew)
     VALUES ($1,$2,now(),now()+interval '30 days','active',false) RETURNING id`, [userId, planId]);
  return id;
}
async function addPaymentAndTx(userId, subscriptionId, ref) {
  const { rows: [{ id: payId }] } = await pool.query(
    `INSERT INTO payments (user_id,subscription_id,amount,currency,method,status,transaction_reference)
     VALUES ($1,$2,9.99,'XOF','wave','succeeded',$3) RETURNING id`, [userId, subscriptionId, ref]);
  const { rows: [{ id: txId }] } = await pool.query(
    `INSERT INTO transactions (payment_id,type,amount,description)
     VALUES ($1,'paiement',9.99,'a6 test') RETURNING id`, [payId]);
  return { payId, txId };
}
const deleteApi = (id, token) =>
  fetch(`${API}/users/${id}`, { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} });

// Lot 2G.6 (Étape C) — fixture admin EXPLICITE : créée si absente (donnée
// synthétique de test) ; échec clair si la création échoue (plus de crash sur
// un prérequis muet). Le JWT admin reste forgé par construction de cette suite ;
// l'authentification normale est couverte par test-api-approle-2g6.js.
{
  const { rows } = await pool.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
  if (rows.length === 0) {
    const { rowCount } = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ('fixture-admin', $1, 'x', 'admin')",
      [`fixture-admin-${Date.now().toString(36)}@test.local`]);
    if (rowCount !== 1) {
      console.error("PRÉREQUIS MANQUANT : impossible de créer le compte admin de test.");
      process.exit(2);
    }
    console.log("FIXTURE_OK admin synthétique créé (prérequis explicite A6)");
  }
}
try {
  const { rows: [{ id: adminId }] } = await pool.query(
    "SELECT id FROM users WHERE role='admin' ORDER BY created_at LIMIT 1");
  const adminTok = await sign(adminId, "admin");

  // --- Cas 1 : sans données dépendantes ---
  {
    const u = await makeUser("c1");
    const r = await deleteApi(u.id, adminTok);
    const { rows: [{ n }] } = await pool.query("SELECT count(*)::int AS n FROM users WHERE id=$1", [u.id]);
    check("A6-1 suppression sans données dépendantes → 200 + disparu", r.status === 200 && n === 0, `http=${r.status} restant=${n}`);
  }

  // --- Cas 2 : avec abonnement (sans paiement) ---
  {
    const u = await makeUser("c2");
    const sid = await addSubscription(u.id);
    const r = await deleteApi(u.id, adminTok);
    const { rows: [{ nu, ns }] } = await pool.query(
      "SELECT (SELECT count(*)::int FROM users WHERE id=$1) AS nu, (SELECT count(*)::int FROM subscriptions WHERE user_id=$1) AS ns", [u.id]);
    check("A6-2 suppression avec abonnement (sans paiement) → 200 + abonnement purgé par CASCADE", r.status === 200 && nu === 0 && ns === 0, `http=${r.status} users=${nu} subs=${ns}`);
  }
  // --- Cas 3 : avec payment + transaction → refus métier 409 ---
  let finUser = null;
  {
    finUser = await makeUser("c3");
    const sid = await addSubscription(finUser.id, "Premium");
    await addPaymentAndTx(finUser.id, sid, `a6-ref-${Date.now().toString(36)}`);
    const r = await deleteApi(finUser.id, adminTok);
    const body = await r.json().catch(() => ({}));
    check("A6-3 suppression avec payment+transaction → 409 USER_HAS_FINANCIAL_HISTORY",
      r.status === 409 && body.code === "USER_HAS_FINANCIAL_HISTORY", `http=${r.status} code=${body.code}`);
  }

  // --- Cas 4 : aucune perte financière après refus ---
  {
    const { rows: [{ nu, ns, np, nt }] } = await pool.query(
      `SELECT (SELECT count(*)::int FROM users WHERE id=$1) AS nu,
              (SELECT count(*)::int FROM subscriptions WHERE user_id=$1) AS ns,
              (SELECT count(*)::int FROM payments WHERE user_id=$1) AS np,
              (SELECT count(*)::int AS nt FROM transactions t JOIN payments p ON p.id=t.payment_id WHERE p.user_id=$1) AS nt`,
      [finUser.id]);
    check("A6-4 historique financier intact après refus (1 user, 1 sub, 1 payment, 1 transaction)",
      nu === 1 && ns === 1 && np === 1 && nt === 1, `users=${nu} subs=${ns} payments=${np} transactions=${nt}`);
  }

  // --- Cas 5 : réponse API sans fuite interne ---
  {
    const r = await deleteApi(finUser.id, adminTok);
    const raw = await r.text();
    const leak = /23503|foreign|constraint|violates|pg_|SELECT |DELETE FROM|stack|Error:/i.test(raw);
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch { /* non-JSON = fuite possible */ }
    check("A6-5 réponse 409 JSON cohérente (code+message), sans fuite interne",
      r.status === 409 && parsed && typeof parsed.code === "string" && typeof parsed.message === "string" && !leak,
      `http=${r.status} leak=${leak} keys=${parsed ? Object.keys(parsed).join(",") : "non-JSON"}`);
  }

  // --- Cas 6 : accès interdit ---
  {
    const u = await makeUser("c6");
    const userTok = await sign(u.id, "user");
    const r403 = await deleteApi(finUser.id, userTok);
    const r401 = await deleteApi(finUser.id, null);
    check("A6-6 accès interdit : user simple → 403, sans token → 401 (jamais de suppression)",
      r403.status === 403 && r401.status === 401, `user=${r403.status} anonyme=${r401.status}`);
  }

  // --- Cas 7 : non-régression comptes & abonnements ---
  {
    const u = await makeUser("c7");
    const userTok = await sign(u.id, "user");
    const me = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${userTok}` } });
    const { rows: [{ id: freeId }] } = await pool.query("SELECT id FROM plans WHERE name='Free'");
    const sub = await fetch(`${API}/subscriptions/subscribe`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${userTok}` },
      body: JSON.stringify({ planId: freeId, paymentMethod: "free" }),
    });
    const plans = await fetch(`${API}/plans`);
    check("A6-7 non-régression : /auth/me 200 + subscribe gratuit 201 + /plans 200",
      me.status === 200 && sub.status === 201 && plans.status === 200, `me=${me.status} sub=${sub.status} plans=${plans.status}`);
  }

  // --- Cas 8 : comportement transactionnel en cas d'échec (aucun état partiel) ---
  {
    const before = await pool.query(
      `SELECT (SELECT count(*)::int FROM users WHERE id=$1) AS nu,
              (SELECT count(*)::int FROM subscriptions WHERE user_id=$1) AS ns,
              (SELECT count(*)::int FROM payments WHERE user_id=$1) AS np`,
      [finUser.id]);
    await deleteApi(finUser.id, adminTok); // 2e tentative — doit échouer à nouveau
    const after = await pool.query(
      `SELECT (SELECT count(*)::int FROM users WHERE id=$1) AS nu,
              (SELECT count(*)::int FROM subscriptions WHERE user_id=$1) AS ns,
              (SELECT count(*)::int FROM payments WHERE user_id=$1) AS np`,
      [finUser.id]);
    const b = before.rows[0], a = after.rows[0];
    check("A6-8 échec atomique : 2e tentative refusée, aucun état partiel (users/subs/payments inchangés)",
      b.nu === 1 && b.ns === 1 && b.np === 1 && a.nu === b.nu && a.ns === b.ns && a.np === b.np,
      `avant=${b.nu}/${b.ns}/${b.np} après=${a.nu}/${a.ns}/${a.np}`);
  }
} finally {
  // Nettoyage CIBLÉ : uniquement les comptes phase5c-*@test.local créés ici,
  // dans l'ordre FK (transactions → payments → subscriptions → users).
  const { rows: ids } = await pool.query("SELECT id, email FROM users WHERE email LIKE 'phase5c-%@test.local'");
  const known = new Set(createdEmails);
  const targets = ids.filter((r) => known.has(r.email)).map((r) => r.id);
  if (ids.length !== targets.length) {
    console.log(`⚠️ ${ids.length - targets.length} compte(s) phase5c-* hors périmètre de cette mission — NON touché(s).`);
  }
  for (const id of targets) {
    // Ordre FK explicite + résilience : un échec sur un compte n'interrompt pas les autres.
    try {
      await pool.query("DELETE FROM transactions WHERE payment_id IN (SELECT id FROM payments WHERE user_id=$1)", [id]);
      await pool.query("DELETE FROM payments WHERE user_id=$1", [id]);
      await pool.query("DELETE FROM subscriptions WHERE user_id=$1", [id]);
      await pool.query("DELETE FROM users WHERE id=$1", [id]);
    } catch (e) {
      console.log(`⚠️ nettoyage incompte pour ${id} : ${e.code || e.message}`);
    }
  }
  console.log(`Nettoyage : ${targets.length} compte(s) de test supprimé(s) (identité vérifiée).`);
  await pool.end();
}

console.log(failures === 0 ? "\nBILAN A6: TOUS PASS" : `\nBILAN A6: ${failures} FAIL`);
process.exit(failures > 0 ? 1 : 0);

