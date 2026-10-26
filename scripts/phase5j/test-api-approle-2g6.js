#!/usr/bin/env node
/**
 * Lot 2G.6 — Parcours API sous le VRAI rôle applicatif `cvc_app`.
 *
 * PRINCIPE : toutes les assertions passent par l'API (serveur connecté en
 * `cvc_app`, vérifié par l'environnement du processus) ; AUCUN JWT forgé —
 * l'identité admin est obtenue par CONNEXION NORMALE sur un compte de fixture.
 * Le pool de fixtures (CVC_TEST_DB_URL, rôle opérateur) ne sert qu'à créer/
 * nettoyer des données SYNTHÉTIQUES (compte admin, paiements de test) — jamais
 * à contourner une autorisation (les vérifications sont faites via HTTP).
 *
 * Usage : CVC_TEST_DB_URL=<base-jetable> node scripts/phase5j/test-api-approle-2g6.js [PORT=5005]
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertTestTarget } from "../lib/safe-target.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../Backend/package.json"));
const pg = require("pg");
const bcrypt = require("bcryptjs");

const PORT = Number(process.argv[2] || 5005);
const BASE = `http://localhost:${PORT}/api`;

// ---------- Garde de cible (fixtures) ----------
const targetUrl = process.env.CVC_TEST_DB_URL;
const ident = await assertTestTarget({ url: targetUrl, mode: "write" });
console.log(`CIBLE_FIXTURES base=${ident.db} role=${ident.user} (${ident.server})`);
const pool = new pg.Pool({ connectionString: targetUrl, max: 2, connectionTimeoutMillis: 30000 });

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | ${detail}`);
}
const rnd = () => Math.random().toString(36).slice(2, 10);
const ADMIN_PWD = `adm-${rnd()}-2g6`;

// ---------- Fixtures synthétiques ----------
// 1. Compte admin (connexion normale ultérieure) — le code applicatif ne peut
//    PAS créer d'admin (policy users_insert_app) : fixture explicite.
const adminEmail = `adm-${rnd()}@test.local`;
const adminHash = await bcrypt.hash(ADMIN_PWD, 4);
await pool.query(
  "INSERT INTO users (name, email, password, role) VALUES ('adm-2g6', $1, $2, 'admin')",
  [adminEmail, adminHash]);
console.log(`FIXTURE_OK admin synthétique (login normal) : ${adminEmail}`);
// 2. Plans (idempotent)
await pool.query(`INSERT INTO plans (name, price, duree, features, description, max_downloads) VALUES
  ('Free', 0, 365, '{}', 'fixture 2G.6', 5), ('Basic', 5000, 30, '{}', 'fixture 2G.6', 25),
  ('Premium', 15000, 30, '{}', 'fixture 2G.6', 100) ON CONFLICT (name) DO NOTHING`);

// ---------- Helpers API (cookies, comme le navigateur) ----------
const cookies = (r) => (r.headers.getSetCookie?.() || [])
  .map((c) => c.split(";")[0]).join("; ");
async function api(pathname, { method = "GET", body, token, cookie } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`${BASE}${pathname}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  return { r, json: await r.json().catch(() => ({})) };
}

const cleanup = [];
try {
  // ============ Inscription / connexion / session / déconnexion ============
  const uEmail = `u-${rnd()}@test.local`;
  let res = await api("/auth/register", {
    method: "POST", body: { name: "u2g6", email: uEmail, password: "pwd-2g6-test", role: "admin" } });
  check("A1 inscription (role='admin' dans le body ignoré → compte user)", res.r.status === 201,
    `http=${res.r.status}`);
  cleanup.push(uEmail);

  res = await api("/auth/login", { method: "POST", body: { email: uEmail, password: "pwd-2g6-test" } });
  const uCookie = cookies(res.r);
  check("A2 connexion utilisateur (normale) → 200 + cookie", res.r.status === 200 && !!uCookie,
    `http=${res.r.status} cookie=${!!uCookie}`);
  if (!uCookie) {
    console.error("PRÉREQUIS NON REMPLI : connexion utilisateur impossible " +
      "(rate-limit 429 ?) — aucune assertion ultérieure ne doit passer à vide.");
    await pool.end();
    process.exit(2);
  }

  res = await api("/auth/me", { cookie: uCookie });
  check("A3 /auth/me → 200, identité et rôle=user", res.r.status === 200 && res.json.email === uEmail
    && (res.json.role ?? res.json.user?.role) === "user",
    `http=${res.r.status} role=${res.json.role ?? res.json.user?.role}`);

  // A4a : logout efface le cookie d'authentification (côté client)
  // A4b : SÉCURITÉ — le JWT doit-il être révoqué côté serveur après logout ?
  //       État réel : logout = clearAuthCookie UNIQUEMENT (AuthRoute.js:186-189),
  //       JWT expiresIn "1d" ; aucun mécanisme de révocation (RevokeToken absent).
  res = await api("/auth/logout", { method: "POST", cookie: uCookie });
  const cleared = (res.r.headers.getSetCookie?.() || []).some((c) => /token=;|token=(""|'')|expires=Thu, 01 Jan 1970/i.test(c) || /token=;/i.test(c));
  const meAfter = await api("/auth/me", { cookie: uCookie });
  check("A4a déconnexion → cookie d'auth effacé (Set-Cookie d'expiration)", res.r.status === 200 && cleared,
    `logout=${res.r.status} cookie_efface=${cleared}`);
  check("A4b révocation serveur du JWT après déconnexion (P2 si non révoqué)",
    meAfter.r.status === 401,
    `ancien_token_accepte=${meAfter.r.status === 200} (/auth/me=${meAfter.r.status}) — TTL JWT=1d`);
  // reconnexion pour la suite
  res = await api("/auth/login", { method: "POST", body: { email: uEmail, password: "pwd-2g6-test" } });
  const uC = cookies(res.r);

  // ============ Autorisations client / administrateur ============
  res = await api("/auth/login", { method: "POST", body: { email: adminEmail, password: ADMIN_PWD } });
  const aC = cookies(res.r);
  check("A5 connexion admin NORMALE (pas de JWT forgé) → 200", res.r.status === 200 && !!aC,
    `http=${res.r.status}`);
  if (!aC) {
    console.error("PRÉREQUIS NON REMPLI : connexion admin impossible — arrêt (aucun faux PASS).");
    await pool.end();
    process.exit(2);
  }

  const asUser = await api("/users", { cookie: uC });
  const asAdmin = await api("/users", { cookie: aC });
  check("A6 GET /users : user → 403, admin → 200", asUser.r.status === 403 && asAdmin.r.status === 200,
    `user=${asUser.r.status} admin=${asAdmin.r.status}`);

  const planRes = await api("/plans");
  const raw = planRes.json;
  const plans = Array.isArray(raw) ? raw : (raw.plans || raw.data || raw.items || []);
  const freePlan = plans.find((p) => p.name === "Free");
  const basicPlan = plans.find((p) => p.name === "Basic");
  check("A7 GET /plans public (sans auth) → 200", planRes.r.status === 200 && !!freePlan,
    `http=${planRes.r.status} plans=${Array.isArray(plans) ? plans.length : "?"}`);

  const pUser = await api("/plans", { method: "POST", cookie: uC, body: { name: "X", price: 1, duree: 1, features: [], description: "x", max_downloads: 1 } });
  check("A8 POST /plans en user → 403 (refus opération admin)", pUser.r.status === 403,
    `http=${pUser.r.status}`);

  // Lecture + modification des données AUTORISÉES (souscription → plan user)
  if (freePlan) {
    res = await api("/subscriptions/subscribe", {
      method: "POST", cookie: uC,
      body: { planId: freePlan._id ?? freePlan.id, paymentMethod: "free" } });
    const me2 = await api("/auth/me", { cookie: uC });
    const sub = me2.json.subscription ?? {};
    check("A9 subscribe Free → 201 + /auth/me reflète le plan (données modifiables)",
      res.r.status === 201 && sub.plan === "Free",
      `http=${res.r.status} plan=${sub.plan}`);
    check("A10 quotas : Free = downloadsUsed/maxDownloads cohérents",
      sub.downloadsUsed === 0 && sub.maxDownloads === 5,
      `used=${sub.downloadsUsed} max=${sub.maxDownloads}`);
  } else check("A9/A10 souscription et quotas", false, "plan Free introuvable");

  // Contrôle de propriété / refus admin
  const rawU = asAdmin.json;
  const userList = Array.isArray(rawU) ? rawU : (rawU.users || rawU.data || rawU.items || []);
  const target = userList.find((x) => (x.email || "").startsWith("u-"));
  const delOther = await api(`/users/${target?.id ?? target?._id ?? "00000000-0000-0000-0000-000000000000"}`,
    { method: "DELETE", cookie: uC });
  check("A11 DELETE /users/:id en user (propriétaire non admin) → 403", delOther.r.status === 403,
    `http=${delOther.r.status}`);

  // ============ Protection des paiements et de l'historique financier ============
  // Fixture : utilisateur AVEC paiement + transaction (données synthétiques).
  const richEmail = `rich-${rnd()}@test.local`;
  await pool.query(
    "INSERT INTO users (name, email, password, role) VALUES ('rich', $1, 'x', 'user')", [richEmail]);
  const richId = (await pool.query("SELECT id FROM users WHERE email=$1", [richEmail])).rows[0].id;
  await pool.query(
    "INSERT INTO subscriptions (user_id, plan_id) SELECT $1, id FROM plans WHERE name='Basic'", [richId]);
  const richSid = (await pool.query("SELECT id FROM subscriptions WHERE user_id=$1", [richId])).rows[0].id;
  await pool.query(`INSERT INTO payments (user_id, subscription_id, amount, currency, method, status, transaction_reference)
    VALUES ($1, $2, 5000, 'XOF', 'wave', 'succeeded', $3)`, [richId, richSid, `ref-${rnd()}`]);
  const richPid = (await pool.query("SELECT id FROM payments WHERE user_id=$1", [richId])).rows[0].id;
  await pool.query("INSERT INTO transactions (payment_id, type, amount) VALUES ($1, 'paiement', 5000)", [richPid]);

  const delRich = await api(`/users/${richId}`, { method: "DELETE", cookie: aC });
  const richBody = JSON.stringify(delRich.json);
  check("A12 suppression d'un user AVEC historique → 409 métier contrôlé (pas d'erreur SQL)",
    delRich.r.status === 409 && /USER_HAS_FINANCIAL_HISTORY/.test(richBody)
      && !/relation|pg_|SQLSTATE|SELECT /i.test(richBody),
    `http=${delRich.r.status} code=${delRich.json.code}`);

  // Plan référencé par un abonnement → 409 contrôlé
  const delPlan = await api(`/plans/${basicPlan?._id ?? basicPlan?.id ?? "00000000-0000-0000-0000-000000000000"}`,
    { method: "DELETE", cookie: aC });
  check("A13 suppression d'un plan RÉFÉRENCÉ → 409 PLAN_HAS_SUBSCRIPTIONS",
    delPlan.r.status === 409 && /PLAN_HAS_SUBSCRIPTIONS/.test(JSON.stringify(delPlan.json)),
    `http=${delPlan.r.status} code=${delPlan.json.code}`);

  // ============ Erreurs contrôlées ============
  const bad = await api("/auth/register", { method: "POST", body: { email: "pas-un-email" } });
  const unk = await api("/route-inexistante");
  const leak = JSON.stringify(bad.json) + JSON.stringify(unk.json);
  check("A14 erreurs contrôlées : 400 (validation) + 404 (route), aucune fuite SQL",
    bad.r.status === 400 && unk.r.status === 404 && !/relation|pg_|SQLSTATE|SELECT /i.test(leak),
    `400=${bad.r.status} 404=${unk.r.status}`);
} finally {
  // ---------- Nettoyage : UNIQUEMENT les données synthétiques de ce test ----------
  for (const e of cleanup) await pool.query("DELETE FROM users WHERE email=$1", [e]).catch(() => {});
  await pool.query("DELETE FROM users WHERE email=$1", [adminEmail]).catch(() => {});
  console.log("NETTOYAGE_OK fixtures synthétiques supprimées");
  await pool.end();
}

const failed = results.filter((x) => !x.ok).length;
console.log(`\nBILAN API-APPROLE-2G6: ${results.length - failed}/${results.length} PASS`);
process.exit(failed === 0 ? 0 : 1);

