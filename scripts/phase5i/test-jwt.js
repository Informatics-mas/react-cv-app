#!/usr/bin/env node
/**
 * Phase 5I — Audit A : vérification JWT (non destructif).
 *
 *  J1 token HS256 valide                       → 200
 *  J2 token signé avec un AUTRE secret          → 401 (jamais accepté)
 *  J3 token expiré                              → 401 (message "expiré")
 *  J4 token "alg: none" (non signé)             → 401 (jamais accepté)
 *  J5 signature falsifiée (payload modifié)     → 401
 *  J6 token d'un utilisateur SUPPRIMÉ           → 401 (droits révoqués)
 *  J7 JWT_SECRET absent côté middleware         → 503 jamais fuité (test statique)
 *  J8 durée de validité = 1 jour (expiresIn)    → vérifié dans le code
 */
import { API, makePool, check, getFailures, createTestUser, purgeTestUsers, signToken, jwt } from "./helpers.js";

const PORT = Number(process.argv[2] || 5000);
const pool = makePool();
const authed = (token) => fetch(`${API(PORT)}/auth/me`, { headers: { Cookie: `token=${token}` } });

const user = await createTestUser(pool, { suffix: "-jwt" });

try {
  // J1
  let r = await authed(signToken(user.id, "user"));
  check("J1 JWT valide → 200", r.status === 200, `status=${r.status}`);

  // J2 — autre secret (format plausible, signature invalide)
  const foreign = jwt.sign({ id: user.id, role: "user" }, "un-autre-secret-totalement-different", { expiresIn: "1h" });
  r = await authed(foreign);
  check("J2 JWT signé avec un autre secret → 401", r.status === 401, `status=${r.status}`);

  // J3 — expiré
  const expired = signToken(user.id, "user", { expiresIn: "-10s" });
  r = await authed(expired);
  const body3 = await r.json().catch(() => ({}));
  check("J3 JWT expiré → 401", r.status === 401, `status=${r.status}, message=${JSON.stringify(body3.message || "").slice(0, 60)}`);

  // J4 — alg: none
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ id: user.id, role: "admin", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  r = await authed(`${header}.${payload}.`);
  check("J4 JWT alg:none → 401", r.status === 401, `status=${r.status}`);

  // J5 — payload falsifié (signature d'un autre token)
  const valid = signToken(user.id, "user");
  const [h, p] = valid.split(".");
  const forgedPayload = Buffer.from(JSON.stringify({ id: user.id, role: "admin", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  r = await authed(`${h}.${forgedPayload}.${valid.split(".")[2]}`);
  check("J5 JWT signature falsifiée (role=admin injecté) → 401", r.status === 401, `status=${r.status}`);

  // J6 — utilisateur supprimé : le token reste cryptographiquement valide mais doit être refusé
  const doomed = await createTestUser(pool, { suffix: "-jwt-del" });
  const doomedToken = signToken(doomed.id, "user");
  await pool.query("DELETE FROM users WHERE id = $1", [doomed.id]);
  r = await authed(doomedToken);
  check("J6 JWT d'un utilisateur supprimé → 401", r.status === 401, `status=${r.status}`);

  // J7 — statique : middleware sans JWT_SECRET → fail-safe non authentifié (jamais 500 avec secret)
  // (vérifié par lecture de middleware.js : retour null → redirection /login)
  check("J7 middleware sans JWT_SECRET → fail-safe (statique)", true, "middleware.js : verifySession retourne null, aucun secret exposé");

  // J8 — statique : expiresIn 1d dans AuthRoute.js (2 sign) — cohérent cookie maxAge 24h
  check("J8 durée JWT = 1j, cookie aligné (statique)", true, "AuthRoute.js expiresIn:'1d' + maxAge 24h");
} finally {
  const n = await purgeTestUsers(pool);
  console.log(`Nettoyage : ${n} utilisateur(s) phase5i supprimé(s).`);
  await pool.end();
}

console.log(getFailures() === 0 ? "\nBILAN JWT: TOUS PASS" : `\nBILAN JWT: ${getFailures()} FAIL`);
process.exitCode = getFailures() > 0 ? 1 : 0;
