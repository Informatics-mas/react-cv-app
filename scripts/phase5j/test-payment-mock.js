#!/usr/bin/env node
/**
 * Lot 2G — tests du mock de paiement (A/B/C/D) — EXÉCUTION EN MODE TEST UNIQUEMENT.
 * Usage : DATABASE_URL=<cvc_admin> node scripts/phase5j/test-payment-mock.js [PORT=5000]
 * Prérequis : backend démarré AVEC PAYMENT_PROVIDER=mock + PAYMENT_MOCK_ENABLED=true
 * + PAYMENT_MOCK_ENV=dev, sur base jetable identifiée.
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
const check = (n, ok, d) => { if (!ok) failures++; console.log(`${ok ? "PASS" : "FAIL"} | ${n} | ${d}`); };
// Lot 2G.7 : tout JWT doit porter un `jti` avec session enregistrée (révocable).
const sign = async (id, role) => {
  const { randomUUID } = await import("node:crypto");
  const jti = randomUUID();
  await pool.query(
    "INSERT INTO user_sessions (jti, user_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')",
    [jti, id]);
  return jwt.sign({ id, role, jti }, process.env.JWT_SECRET, { expiresIn: "1h" });
};
const created = [];
async function makeUser(tag, role = "user") {
  const s = `${tag}-${Date.now().toString(36)}`;
  const email = `phase5c-mock-${s}@test.local`;
  const { rows: [u] } = await pool.query(
    "INSERT INTO users (name,email,password,role,user_plan,user_max_downloads,downloads_used) VALUES ($1,$2,$3,$4,'Free',5,0) RETURNING id",
    [`Mock ${s}`, email, await bcrypt.hash("x", 4), role]);
  created.push(email);
  return { id: u.id, email, token: await sign(u.id, role) };
}
const post = (p, body, token) =>
  fetch(`${API}${p}`, {
    method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: "include", body: JSON.stringify(body),
  });
async function stateOf(userId) {
  const { rows: [u] } = await pool.query("SELECT user_plan, user_max_downloads, downloads_used FROM users WHERE id=$1", [userId]);
  const { rows: [c] } = await pool.query(
    "SELECT (SELECT count(*)::int FROM subscriptions WHERE user_id=$1 AND status='active') AS actives, (SELECT count(*)::int FROM payments WHERE user_id=$1) AS pays, (SELECT count(*)::int FROM transactions t JOIN payments p ON p.id=t.payment_id WHERE p.user_id=$1) AS txs", [userId]);
  return { ...u, ...c };
}

// ================= A. Configuration et isolation (unitaires fail-closed) =================
{
  const { resolvePaymentProvider } = await import("../../Backend/services/paymentProviders/index.js");
  const t = (label, env, expectThrow) => {
    let threw = false, mock = false;
    try { mock = resolvePaymentProvider(env).mock === true; } catch { threw = true; }
    check(label, expectThrow ? threw : !threw && mock, `exception=${threw} mock=${mock}`);
  };
  {
    let ok = false;
    try { ok = resolvePaymentProvider({}).mock === false; } catch { ok = false; }
    check("A1a config absente → aucun prestataire (paiements payants refusés)", ok, "mock=false");
  }
  t("A1b mock + NODE_ENV=production → REFUS fail-closed", { PAYMENT_PROVIDER: "mock", PAYMENT_MOCK_ENABLED: "true", PAYMENT_MOCK_ENV: "dev", NODE_ENV: "production", DATABASE_URL: "postgresql://x@db.example.com/cvc_rehearsal", DATABASE_DRIVER: "postgres" }, true);
  t("A1c mock + DATABASE_URL Supabase → REFUS", { PAYMENT_PROVIDER: "mock", PAYMENT_MOCK_ENABLED: "true", PAYMENT_MOCK_ENV: "dev", DATABASE_URL: "postgresql://x@aws-0.pooler.supabase.com/postgres", DATABASE_DRIVER: "postgres" }, true);
  t("A1d mock sans PAYMENT_MOCK_ENABLED → REFUS", { PAYMENT_PROVIDER: "mock", PAYMENT_MOCK_ENV: "dev", DATABASE_URL: "postgresql://x@db.example.com/cvc_rehearsal", DATABASE_DRIVER: "postgres" }, true);
  t("A1e mock sans PAYMENT_MOCK_ENV → REFUS", { PAYMENT_PROVIDER: "mock", PAYMENT_MOCK_ENABLED: "true", DATABASE_URL: "postgresql://x@db.example.com/cvc_rehearsal", DATABASE_DRIVER: "postgres" }, true);
  t("A1f sélection geniuspay → REFUS explicite", { PAYMENT_PROVIDER: "geniuspay" }, true);
  t("A1g config mock valide (test) → ACTIF", { PAYMENT_PROVIDER: "mock", PAYMENT_MOCK_ENABLED: "true", PAYMENT_MOCK_ENV: "dev", NODE_ENV: "development", DATABASE_URL: "postgresql://x@db.example.com/cvc_rehearsal", DATABASE_DRIVER: "postgres" }, false);
}
// ================= B. Parcours fonctionnels =================
let okRef = null, okUser = null;
{
  const admin = await makeUser("adm", "admin");
  const u = await makeUser("u1");
  okUser = u;
  const { rows: [{ id: freeId }] } = await pool.query("SELECT id FROM plans WHERE name='Free'");
  const { rows: [{ id: paidId, price: paidPrice }] } = await pool.query("SELECT id, price FROM plans WHERE name='Basic'");

  // B1 : plan gratuit — opérationnel indépendamment du mock, aucune ligne payment
  const rB1 = await post("/subscriptions/subscribe", { planId: freeId, paymentMethod: "free" }, u.token);
  const sB1 = await stateOf(u.id);
  check("B1 plan gratuit → 201 + actif + aucune ligne payment", rB1.status === 201 && sB1.actives === 1 && sB1.pays === 0, `http=${rB1.status} actives=${sB1.actives} pays=${sB1.pays}`);

  // B2 : initiate payant → 202 pending, ZÉRO droit, montant = prix SERVEUR
  const rB2 = await post("/subscriptions/subscribe", { planId: paidId, paymentMethod: "card", price: 1 }, u.token);
  const bB2 = await rB2.json();
  okRef = bB2.reference;
  const sB2 = await stateOf(u.id);
  check("B2 initiate payant → 202 pending, référence MOCK-, aucun droit (prix client ignoré)",
    rB2.status === 202 && /^MOCK-/.test(okRef || "") && bB2.mock === true && sB2.user_plan === "Free",
    `http=${rB2.status} ref=${(okRef || "").slice(0, 12)}… plan=${sB2.user_plan}`);
  const { rows: [payB2] } = await pool.query("SELECT status, amount FROM payments WHERE transaction_reference=$1", [okRef]);
  check("B2bis payment 'pending', montant = prix serveur", payB2.status === "pending" && Number(payB2.amount) === Number(paidPrice), `status=${payB2.status} amount=${payB2.amount} attendu=${paidPrice}`);

  // Scénarios dev (admin) sur tentatives dédiées
  const scenario = async (sc) => {
    const r = await post("/subscriptions/subscribe", { planId: paidId, paymentMethod: "card" }, u.token);
    const b = await r.json();
    const sim = await post("/payments/mock/dev/simulate", { reference: b.reference, scenario: sc }, admin.token);
    return { reference: b.reference, sim, body: await sim.json().catch(() => ({})) };
  };

  // B3 : success → actif + droits + transaction
  const sc3 = await scenario("success");
  const s3 = await stateOf(u.id);
  check("B3 scénario success → payment succeeded, sub active, droits accordés, 1 transaction",
    sc3.sim.status === 200 && sc3.body.result?.activated === true && s3.user_plan === "Basic" && s3.actives === 1 && s3.txs === 1,
    `http=${sc3.sim.status} plan=${s3.user_plan} actives=${s3.actives} txs=${s3.txs}`);
  okRef = sc3.reference;

  // B4 : declined → failed/canceled, aucun droit
  const sc4 = await scenario("declined");
  const s4 = await stateOf(u.id);
  check("B4 scénario declined → payment failed, sub canceled, aucun droit",
    sc4.sim.status === 200 && sc4.body.result?.paymentStatus === "failed" && sc4.body.result?.subscriptionStatus === "canceled",
    `pay=${sc4.body.result?.paymentStatus} sub=${sc4.body.result?.subscriptionStatus}`);

  // B5 : cancelled → idem
  const sc5 = await scenario("cancelled");
  check("B5 scénario cancelled → payment failed, sub canceled",
    sc5.sim.status === 200 && sc5.body.result?.paymentStatus === "failed" && sc5.body.result?.subscriptionStatus === "canceled",
    `pay=${sc5.body.result?.paymentStatus} sub=${sc5.body.result?.subscriptionStatus}`);

  // B6/B7/B8 : pending, timeout, provider_error → reste pending, AUCUN droit
  for (const sc of ["pending", "timeout", "provider_error"]) {
    const r = await scenario(sc);
    const { rows: [st] } = await pool.query("SELECT status FROM payments WHERE transaction_reference=$1", [r.reference]);
    const sb = await stateOf(u.id);
    check(`B-${sc} → payment reste 'pending', aucun droit accordé`,
      r.sim.status === 200 && st.status === "pending" && r.body.result?.rights === false, `pay=${st.status}`);
  }

  // B9 : reprise après échec — nouvelle tentative → success possible (sans doublon)
  const sc9 = await scenario("success");
  const s9 = await stateOf(u.id);
  check("B9 reprise après échec → nouvelle tentative confirmée, sans doublon",
    sc9.sim.status === 200 && sc9.body.result?.activated === true && s9.actives === 1 && s9.user_plan === "Basic",
    `actives=${s9.actives} plan=${s9.user_plan}`);
}
// Lot 2G.6 (Étape C) — fixture admin EXPLICITE (voir test-user-delete-a6.js).
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
    console.log("FIXTURE_OK admin synthétique créé (prérequis explicite mock)");
  }
}
// ================= C. Sécurité et autorisation =================
{
  const { rows: [{ id: admId }] } = await pool.query("SELECT id FROM users WHERE role='admin' ORDER BY created_at LIMIT 1");
  const uA = await makeUser("uA");
  const uB = await makeUser("uB");
  const { rows: [{ id: paidId }] } = await pool.query("SELECT id FROM plans WHERE name='Basic'");

  const rInit = await post("/subscriptions/subscribe", { planId: paidId, paymentMethod: "card" }, uA.token);
  const bInit = await rInit.json();
  const refA = bInit.reference;

  const c1 = await post("/payments/mock/sandbox/advance", { reference: refA, outcome: "success" }, null);
  check("C1 utilisateur non authentifié → 401", c1.status === 401, `http=${c1.status}`);

  const c2 = await post("/payments/mock/sandbox/advance", { reference: refA, outcome: "success" }, uB.token);
  check("C2 paiement d'un autre compte → 403 (jamais confirmé)", c2.status === 403, `http=${c2.status}`);

  const c3 = await post("/payments/mock/dev/simulate", { reference: refA, scenario: "success" }, uB.token);
  check("C3 utilisateur ordinaire → mode développeur refusé (403)", c3.status === 403, `http=${c3.status}`);

  const c4 = await post("/subscriptions/subscribe", { planId: "00000000-0000-4000-8000-000000000000", paymentMethod: "card" }, uA.token);
  check("C4 plan inexistant → 404, aucune écriture", c4.status === 404, `http=${c4.status}`);

  const c5 = await post("/payments/mock/sandbox/advance", { reference: "MOCK-faussereference-000", outcome: "success" }, uA.token);
  check("C5 référence falsifiée → 404 INTENT_NOT_FOUND", c5.status === 404, `http=${c5.status}`);

  const c6 = await fetch(`${API}/payments/mock/status/${encodeURIComponent(refA)}`, { headers: { Authorization: `Bearer ${uA.token}` } });
  const b6 = await c6.json();
  check("C6 retour navigateur ≠ confirmation : statut pending, droits false",
    c6.status === 200 && b6.payment?.status === "pending" && b6.rights === false, `statut=${b6.payment?.status} droits=${b6.rights}`);

  const c7a = await post("/payments/mock/notifications", { reference: bInit.reference, event: "payment.succeeded" }, uA.token);
  const c7b = await post("/payments/mock/notifications", { reference: bInit.reference, event: "payment.succeeded" }, uA.token);
  const b7a = await c7a.json(), b7b = await c7b.json();
  check("C7 notification puis rejeu → 1 seule activation, 2e = alreadyProcessed",
    c7a.status === 200 && c7b.status === 200 && (b7a.result?.alreadyProcessed === true || b7a.result?.activated === true) && b7b.result?.alreadyProcessed === true,
    `1er=${JSON.stringify(b7a.result).slice(0, 60)} 2e=${JSON.stringify(b7b.result).slice(0, 60)}`);

  const inv = [
    { reference: bInit.reference, event: "payment.unknown_event" },
    { reference: bInit.reference, event: "payment.succeeded", amount: -5 },
    { reference: bInit.reference },
    { event: "payment.succeeded" },
  ];
  let allRejected = true;
  for (const body of inv) {
    const r = await post("/payments/mock/notifications", body, uA.token);
    if (r.status !== 400) allRejected = false;
  }
  check("C8 notifications invalides/malformées → 400 (jamais traitées)", allRejected, "4/4 rejetées");

  const c9 = await post("/payments/mock/sandbox/advance", { reference: bInit.reference, outcome: "hack" }, uA.token);
  check("C9 résultat inconnu → 400 (énumération stricte)", c9.status === 400, `http=${c9.status}`);
}
// ================= D. Intégrité des données =================
{
  const { rows: [{ id: admId }] } = await pool.query("SELECT id FROM users WHERE role='admin' ORDER BY created_at LIMIT 1");
  const adminTok = await sign(admId, "admin");
  const { rows: [{ id: paidId }] } = await pool.query("SELECT id FROM plans WHERE name='Basic'");

  // D1/D2 : état pending → aucun droit payant
  const uD = await makeUser("uD");
  const rD1 = await post("/subscriptions/subscribe", { planId: paidId, paymentMethod: "card" }, uD.token);
  const bD1 = await rD1.json();
  const sD1 = await stateOf(uD.id);
  check("D1/D2 état pending : aucun abonnement actif, aucun droit payant",
    sD1.actives === 0 && sD1.user_plan === "Free", `actives=${sD1.actives} plan=${sD1.user_plan}`);

  // D3 : notification dupliquée (scénario) → 1 payment, 1 transaction, 1 sub
  const simDup = await post("/payments/mock/dev/simulate", { reference: bD1.reference, scenario: "duplicate_notification" }, adminTok);
  const bDup = await simDup.json();
  const { rows: [cnt] } = await pool.query(
    "SELECT (SELECT count(*)::int FROM payments WHERE transaction_reference=$1) AS pays, (SELECT count(*)::int FROM transactions t JOIN payments p ON p.id=t.payment_id WHERE p.transaction_reference=$1) AS txs, (SELECT count(*)::int FROM subscriptions WHERE user_id=$2) AS subs",
    [bD1.reference, uD.id]);
  check("D3 notification dupliquée → 1 payment, 1 transaction, 1 abonnement (2e = alreadyProcessed)",
    cnt.pays === 1 && cnt.txs === 1 && cnt.subs === 1 && bDup.duplicateResult?.alreadyProcessed === true,
    `pays=${cnt.pays} txs=${cnt.txs} subs=${cnt.subs} dup=${bDup.duplicateResult?.alreadyProcessed}`);

  // D4 : requêtes CONCURRENTES → activation unique
  const uD4 = await makeUser("uD4");
  const rD4 = await post("/subscriptions/subscribe", { planId: paidId, paymentMethod: "card" }, uD4.token);
  const bD4 = await rD4.json();
  const [ra, rb] = await Promise.all([
    post("/payments/mock/sandbox/advance", { reference: bD4.reference, outcome: "success" }, uD4.token),
    post("/payments/mock/sandbox/advance", { reference: bD4.reference, outcome: "success" }, uD4.token),
  ]);
  const ba = await ra.json(), bb = await rb.json();
  const { rows: [cnt4] } = await pool.query(
    "SELECT (SELECT count(*)::int FROM subscriptions WHERE user_id=$1 AND status='active') AS actives, (SELECT count(*)::int FROM payments WHERE user_id=$1 AND status='succeeded') AS succ, (SELECT count(*)::int FROM transactions t JOIN payments p ON p.id=t.payment_id WHERE p.user_id=$1) AS txs", [uD4.id]);
  const single = (ba.result?.activated === true) !== (bb.result?.activated === true) || (ba.result?.alreadyProcessed === true || bb.result?.alreadyProcessed === true);
  check("D4 double confirmation concurrente → activation unique (verrou + idempotence)",
    cnt4.actives === 1 && cnt4.succ === 1 && cnt4.txs === 1 && single,
    `actives=${cnt4.actives} succ=${cnt4.succ} txs=${cnt4.txs}`);

  // D5 : scénario invalid_notification → aucune écriture
  const uD5 = await makeUser("uD5");
  const rD5 = await post("/subscriptions/subscribe", { planId: paidId, paymentMethod: "card" }, uD5.token);
  const bD5 = await rD5.json();
  const before = await stateOf(uD5.id);
  await post("/payments/mock/dev/simulate", { reference: bD5.reference, scenario: "invalid_notification" }, adminTok);
  const after = await stateOf(uD5.id);
  check("D5 notification invalide → aucune écriture (état inchangé)",
    before.pays === after.pays && before.txs === after.txs && before.actives === after.actives && after.actives === 0,
    `avant=${before.pays}/${before.txs}/${before.actives} après=${after.pays}/${after.txs}/${after.actives}`);

  // D7 : A6 — utilisateur avec historique financier → suppression refusée
  const cA6 = await fetch(`${API}/users/${uD4.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${adminTok}` } });
  const bA6 = await cA6.json().catch(() => ({}));
  check("D7 A6 préservé : utilisateur avec historique financier → 409 USER_HAS_FINANCIAL_HISTORY",
    cA6.status === 409 && bA6.code === "USER_HAS_FINANCIAL_HISTORY", `http=${cA6.status} code=${bA6.code}`);
}

// ================= Nettoyage (ordre FK, identité = emails créés ci-dessus) =================
{
  const known = new Set(created);
  const { rows: found } = await pool.query("SELECT id, email FROM users WHERE email LIKE 'phase5c-mock-%@test.local'");
  const targets = found.filter((r) => known.has(r.email)).map((r) => r.id);
  for (const id of targets) {
    try {
      await pool.query("DELETE FROM transactions WHERE payment_id IN (SELECT id FROM payments WHERE user_id=$1)", [id]);
      await pool.query("DELETE FROM payments WHERE user_id=$1", [id]);
      await pool.query("DELETE FROM subscriptions WHERE user_id=$1", [id]);
      await pool.query("DELETE FROM users WHERE id=$1", [id]);
    } catch (e) {
      console.log(`⚠️ nettoyage incomplet ${id} : ${e.code || e.message}`);
    }
  }
  console.log(`Nettoyage : ${targets.length} compte(s) de test supprimé(s) (identité vérifiée).`);
  await pool.end();
}

console.log(failures === 0 ? "\nBILAN PAYMENT-MOCK: TOUS PASS" : `\nBILAN PAYMENT-MOCK: ${failures} FAIL`);
process.exit(failures > 0 ? 1 : 0);



