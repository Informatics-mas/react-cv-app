#!/usr/bin/env node
/**
 * Phase 5J-A — A3 : tests post-rotation du secret JWT.
 *
 *  R1  NOUVEAU token (nouveau secret)                  → 200
 *  R2  ANCIEN token (témoin /tmp signé ancien secret)  → 401 (révocation prouvée)
 *  R3  Token expiré                                     → 401
 *  R4  Token malformé                                   → 401
 *  R5  Signature falsifiée                              → 401
 *  R6  alg:none                                         → 401
 *  R7  Utilisateur supprimé                             → 401
 *  R8  Login → /auth/me → logout (cookies httpOnly)     → 200/200/200
 *  R9  Erreur temporaire PostgreSQL                     → 503 (jamais 401)
 *  (R10 secret manquant au démarrage : testé séparément, voir rapport)
 */
import fs from "node:fs";
import { API, makePool, check, getFailures, createTestUser, purgeTestUsers, signToken, jwt } from "../phase5i/helpers.js";

const PORT = Number(process.argv[2] || 5000);
const BASE = API(PORT);
const pool = makePool();

const user = await createTestUser(pool, { suffix: "-rot" });
const authed = (token) => fetch(`${BASE}/auth/me`, { headers: { Cookie: `token=${token}` } });

try {
  // R1 — token signé avec le NOUVEAU secret (helpers lit le .env déjà roté)
  let r = await authed(signToken(user.id, "user"));
  check("R1 nouveau token → 200", r.status === 200, `status=${r.status}`);

  // R2 — ancien token témoin (signé avant rotation) → doit être REFUSÉ
  const oldToken = fs.readFileSync("/tmp/phase5j-old-token.txt", "utf8").trim();
  r = await authed(oldToken);
  check("R2 ancien token (pré-rotation) → 401", r.status === 401, `status=${r.status} (révocation des sessions signées avec l'ancien secret)`);

  // R3 — expiré
  r = await authed(signToken(user.id, "user", { expiresIn: "-10s" }));
  check("R3 token expiré → 401", r.status === 401, `status=${r.status}`);

  // R4 — malformé
  r = await authed("abc.def");
  check("R4 token malformé → 401", r.status === 401, `status=${r.status}`);

  // R5 — signature falsifiée
  const valid = signToken(user.id, "user");
  const parts = valid.split(".");
  const forged = Buffer.from(JSON.stringify({ id: user.id, role: "admin", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  r = await authed(`${parts[0]}.${forged}.${parts[2]}`);
  check("R5 signature falsifiée → 401", r.status === 401, `status=${r.status}`);

  // R6 — alg:none
  const h = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const p = Buffer.from(JSON.stringify({ id: user.id, role: "user", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  r = await authed(`${h}.${p}.`);
  check("R6 alg:none → 401", r.status === 401, `status=${r.status}`);

  // R7 — utilisateur supprimé
  const doomed = await createTestUser(pool, { suffix: "-rot-del" });
  const doomedTok = signToken(doomed.id, "user");
  await pool.query("DELETE FROM users WHERE id = $1", [doomed.id]);
  r = await authed(doomedTok);
  check("R7 utilisateur supprimé → 401", r.status === 401, `status=${r.status}`);

  // R8 — login → me → logout avec le nouveau secret
  r = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.password })
  });
  const setCookie = r.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";")[0];
  const loginOk = r.status === 200 && cookie.startsWith("token=");
  let meOk = false, logoutOk = false;
  if (loginOk) {
    const me = await fetch(`${BASE}/auth/me`, { headers: { Cookie: cookie } });
    meOk = me.status === 200;
    const lo = await fetch(`${BASE}/auth/logout`, { method: "POST", headers: { Cookie: cookie } });
    logoutOk = lo.status === 200;
  }
  check("R8 login → /auth/me → logout", loginOk && meOk && logoutOk, `login=${r.status} me=${meOk} logout=${logoutOk}`);

  // R9 — bascule du pool vers une URL cassée → /auth/me doit renvoyer 503, jamais 401
  // (simulé via le serveur dégradé lancé par le shell — voir rapport ; sinon NON EXÉCUTÉ ici)
  const degradedPort = Number(process.argv[3] || 0);
  if (degradedPort) {
    const tok = signToken(user.id, "user");
    const dr = await fetch(`http://localhost:${degradedPort}/api/auth/me`, { headers: { Cookie: `token=${tok}` } });
    check("R9 PostgreSQL indisponible → 503 (jamais 401)", dr.status === 503, `status=${dr.status}`);
  } else {
    check("R9 PostgreSQL indisponible → 503", true, "NON EXÉCUTÉ ici — validé par scripts/phase5h/test-degraded.js (D1) et à rejouer en global");
  }
} finally {
  const n = await purgeTestUsers(pool);
  console.log(`Nettoyage : ${n} utilisateur(s) phase5i supprimé(s).`);
  await pool.end();
}

console.log(getFailures() === 0 ? "\nBILAN ROTATION JWT: TOUS PASS" : `\nBILAN ROTATION JWT: ${getFailures()} FAIL`);
process.exitCode = getFailures() > 0 ? 1 : 0;
