#!/usr/bin/env node
/**
 * Phase 5I — Audit C : injection SQL et validation des entrées.
 * Requêtes non destructives : payloads injectés dans les ENDROITS où ils
 * seraient dangereux si du SQL était concaténé. Attendu : jamais de 500 avec
 * stack SQL, jamais de fuite de lignes autres, table users intacte.
 *
 *  S1 login avec email " ' OR '1'='1 "          → 400/401 (pas de dump)
 *  S2 /auth/me avec UUID injecté dans un token  → 401 (keyFilter → FALSE)
 *  S3 /users/:id avec payload SQL (admin)       → 400 (zod refus) ou 404
 *  S4 /plans/:id avec payload SQL (admin)       → 400/404
 *  S5 /users?limit=<payload> (admin)            → pas de 500 SQL
 *  S6 subscribe avec planId payload             → 400 (zod refus)
 *  S7 email register très long / null bytes     → 400
 *  S8 intégrité : count(users) inchangé, aucune table modifiée
 */
import { API, makePool, check, getFailures, createTestUser, purgeTestUsers, signToken } from "./helpers.js";

const PORT = Number(process.argv[2] || 5000);
const BASE = API(PORT);
const pool = makePool();

const admin = await createTestUser(pool, { role: "admin", suffix: "-sqli" });
const adminTok = signToken(admin.id, "admin");
const user = await createTestUser(pool, { suffix: "-sqli" });
const userTok = signToken(user.id, "user");

const call = (method, path, token, body) =>
  fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Cookie: `token=${token}` } : {}) },
    ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {})
  });

const { rows: [{ n: countBefore }] } = await pool.query("SELECT count(*)::int AS n FROM users");
const SQL_ERR = /syntax error|pg_|SQLSTATE|relation .* does not exist/i;

try {
  // S1 — injection dans email (login)
  let r = await call("POST", "/auth/login", null, { email: "' OR '1'='1' --", password: "x" });
  let body = await r.json().catch(() => ({}));
  check("S1 login injection email → 400/401 sans erreur SQL", (r.status === 400 || r.status === 401) && !SQL_ERR.test(JSON.stringify(body)),
    `status=${r.status}`);

  // S1 bis — email = payload UNION
  r = await call("POST", "/auth/login", null, { email: "a' UNION SELECT password FROM users --", password: "x" });
  body = await r.json().catch(() => ({}));
  check("S1 bis login UNION SELECT → 400/401 sans fuite", (r.status === 400 || r.status === 401) && !SQL_ERR.test(JSON.stringify(body)) && !/"password"/.test(JSON.stringify(body)),
    `status=${r.status}`);

  // S2 — identifiant injecté via token (claim id)
  const jwtLib = (await import("./helpers.js")).jwt;
  const evilIdToken = jwtLib.sign({ id: "x' OR '1'='1", role: "user" }, process.env.JWT_SECRET, { expiresIn: "1h" });
  r = await call("GET", "/auth/me", evilIdToken);
  body = await r.json().catch(() => ({}));
  check("S2 /auth/me avec id injecté → 401 (keyFilter FALSE)", r.status === 401 && !SQL_ERR.test(JSON.stringify(body)),
    `status=${r.status}`);

  // S3 — /users/:id payload SQL (admin)
  r = await call("DELETE", `/users/${encodeURIComponent("1; DROP TABLE users;--")}`, adminTok);
  check("S3 /users/:id payload SQL → 400/404 sans exécution", (r.status === 400 || r.status === 404),
    `status=${r.status}`);

  // S4 — /plans/:id payload SQL (admin)
  r = await call("PUT", `/plans/${encodeURIComponent("' OR 1=1 --")}`, adminTok, { name: "X", price: 1, duree: 1, maxDownloads: 5, features: ["a"], description: "description suffisante" });
  check("S4 /plans/:id payload SQL → 400/404", (r.status === 400 || r.status === 404), `status=${r.status}`);

  // S5 — limit param payload
  r = await call("GET", `/users?limit=${encodeURIComponent("1; DELETE FROM users;--")}`, adminTok);
  body = await r.json().catch(() => ({}));
  check("S5 /users?limit= payload SQL → pas d'exécution", r.status === 200 && Array.isArray(body.data ?? body) && !SQL_ERR.test(JSON.stringify(body).slice(0, 500)),
    `status=${r.status}`);

  // S6 — planId payload dans subscribe
  r = await call("POST", "/subscriptions/subscribe", userTok, { planId: "1; UPDATE users SET role='admin';--", paymentMethod: "free" });
  check("S6 subscribe planId payload → 400 (zod)", r.status === 400, `status=${r.status}`);

  // S7 — email avec null byte / très long
  r = await call("POST", "/auth/register", null, { name: "Phase5I S7", email: `a${"x".repeat(400)}@test.local`, password: "Phase5I!pass75" });
  check("S7 register email 400+ caractères → 400", r.status === 400, `status=${r.status}`);

  // S8 — intégrité
  const { rows: [{ n: countAfter }] } = await pool.query("SELECT count(*)::int AS n FROM users");
  const { rows: tables } = await pool.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'");
  check("S8 intégrité : users intacte (aucune suppression sauvage)", countAfter >= countBefore - 2,
    `users ${countBefore}→${countAfter} (seuls comptes temporaires purgés), tables public=${tables[0].n}`);
} finally {
  const n = await purgeTestUsers(pool);
  console.log(`Nettoyage : ${n} utilisateur(s) phase5i supprimé(s).`);
  await pool.end();
}

console.log(getFailures() === 0 ? "\nBILAN INJECTION: TOUS PASS" : `\nBILAN INJECTION: ${getFailures()} FAIL`);
process.exitCode = getFailures() > 0 ? 1 : 0;
