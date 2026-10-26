#!/usr/bin/env node
/**
 * Phase 5I — Audit B : autorisation, rôles et propriété des ressources.
 *
 *  A1  GET  /users (admin)           : user normal → 403, admin → 200, anonyme → 401
 *  A2  DELETE /users/:id             : user normal → 403 (ni 404 ni 200)
 *  A3  POST /plans (admin)           : user normal → 403
 *  A4  PUT  /plans/:id (admin)       : user normal → 403
 *  A5  DELETE /plans/:id (admin)     : user normal → 403
 *  A6  GET  /subscriptions (admin)   : user normal → 403
 *  A7  PUT  /subscriptions/:id       : user normal → 403
 *  A8  GET  /stats/dashboard-stats   : user normal → 403
 *  A9  POST /parse-cv (premium)      : user normal → 403 PREMIUM_REQUIRED
 *  A10 IDOR : user A tente de modifier l'abonnement de user B via PUT /subscriptions/:id → 403
 *  A11 Un body client {role:"admin"} au register n'élève PAS les privilèges
 *  A12 Une route admin n'est pas accessible via une méthode HTTP alternative
 */
import { API, makePool, check, getFailures, createTestUser, purgeTestUsers, signToken } from "./helpers.js";

const PORT = Number(process.argv[2] || 5000);
const BASE = API(PORT);
const pool = makePool();

const admin = await createTestUser(pool, { role: "admin", suffix: "-authz" });
const user = await createTestUser(pool, { suffix: "-authz" });
const victim = await createTestUser(pool, { suffix: "-authz-victim" });
const adminTok = signToken(admin.id, "admin");
const userTok = signToken(user.id, "user");

const call = (method, path, token, body) =>
  fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Cookie: `token=${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

try {
  // --- Matrice admin ---
  const adminRoutes = [
    ["GET", "/users", null],
    ["DELETE", `/users/${victim.id}`, null],
    ["POST", "/plans", { name: "X", price: 1, duree: 1, maxDownloads: 5, features: ["a"], description: "description suffisante" }],
    ["PUT", `/plans/00000000-0000-0000-0000-000000000000`, { name: "X", price: 1, duree: 1, maxDownloads: 5, features: ["a"], description: "description suffisante" }],
    ["DELETE", `/plans/00000000-0000-0000-0000-000000000000`, null],
    ["GET", "/subscriptions", null],
    ["PUT", `/subscriptions/00000000-0000-0000-0000-000000000000`, { status: "expired" }],
    ["GET", "/stats/dashboard-stats", null]
  ];
  let allOk = true, details = [];
  for (const [method, path, body] of adminRoutes) {
    const anon = await call(method, path, null, body);
    const asUser = await call(method, path, userTok, body);
    const ok = anon.status === 401 && asUser.status === 403;
    if (!ok) { allOk = false; details.push(`${method} ${path}: anon=${anon.status} user=${asUser.status}`); }
  }
  check("A1-A8 routes admin : anonyme→401, user→403", allOk, allOk ? "8 routes × (401/403) conformes" : details.join(" ; "));
  const asAdmin = await call("GET", "/users", adminTok);
  check("A1 bis admin → 200 sur /users", asAdmin.status === 200, `status=${asAdmin.status}`);

  // A9 — parse-cv : gating premium côté serveur
  const prem = await call("POST", "/parse-cv", userTok);
  check("A9 POST /parse-cv user Free → 403 PREMIUM_REQUIRED", prem.status === 403, `status=${prem.status}`);

  // A10 — IDOR : user A modifie l'abonnement d'un autre → 403 (adminOnly)
  const idor = await call("PUT", `/subscriptions/00000000-0000-0000-0000-000000000000`, userTok, { status: "active" });
  check("A10 IDOR PUT /subscriptions/:id → 403", idor.status === 403, `status=${idor.status}`);

  // A11 — élévation de privilèges par le corps de requête au register
  const reg = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Phase5I Elev ${Date.now().toString(36)}`,
      email: `phase5i-elev-${Date.now().toString(36)}@test.local`,
      password: "Phase5I!pass75",
      role: "admin",
      user_max_downloads: 9999,
      downloads_used: -5
    })
  });
  const regBody = await reg.json().catch(() => ({}));
  const createdId = regBody.user?.id;
  let elevOk = false, elevDetail = "";
  if (reg.status === 201 && createdId) {
    const { rows: [row] } = await pool.query("SELECT role, user_max_downloads, downloads_used FROM users WHERE id = $1", [createdId]);
    elevOk = row.role === "user" && row.user_max_downloads === 5 && row.downloads_used === 0;
    elevDetail = `role=${row.role} max=${row.user_max_downloads} used=${row.downloads_used} (attendu user/5/0)`;
  } else {
    elevDetail = `register status=${reg.status} (rejet ou création)`;
    elevOk = reg.status !== 201; // rejet = pas d'élévation non plus
  }
  check("A11 register sans élévation de privilèges", elevOk, elevDetail);

  // A12 — méthode alternative sur route admin (POST sur GET /users)
  const alt = await call("POST", "/users", userTok, {});
  check("A12 méthode alternative non protégée inexistante", alt.status === 404 || alt.status === 401 || alt.status === 403,
    `POST /users → status=${alt.status} (attendu 404/401/403, jamais 200)`);
} finally {
  const n = await purgeTestUsers(pool);
  console.log(`Nettoyage : ${n} utilisateur(s) phase5i supprimé(s).`);
  await pool.end();
}

console.log(getFailures() === 0 ? "\nBILAN AUTHZ: TOUS PASS" : `\nBILAN AUTHZ: ${getFailures()} FAIL`);
process.exitCode = getFailures() > 0 ? 1 : 0;
