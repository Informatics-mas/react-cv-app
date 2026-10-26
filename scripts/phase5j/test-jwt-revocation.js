#!/usr/bin/env node
/**
 * Lot 2G.7 — Suite dédiée : révocation des sessions JWT (cycle de vie + sécurité).
 *
 * PRINCIPE : assertions par API (serveur sous test) + preuves DB via le pool de
 * fixtures (CVC_TEST_DB_URL — identité vérifiée par safe-target.js). Les tokens
 * de scénario sont émis avec `jti` + session enregistrée (registre user_sessions),
 * comme le fait l'application. Aucun secret affiché. Données 100 % synthétiques.
 *
 * Usage : CVC_TEST_DB_URL=<base-jetable> node scripts/phase5j/test-jwt-revocation.js [PORT=5005]
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { assertTestTarget } from "../lib/safe-target.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../Backend/package.json"));
require("dotenv").config({ path: path.join(here, "../../Backend/.env") }); // JWT_SECRET uniquement
const pg = require("pg");
const jwt = require("jsonwebtoken");

const PORT = Number(process.argv[2] || 5005);
const BASE = `http://localhost:${PORT}/api`;
const targetUrl = process.env.CVC_TEST_DB_URL;
const ident = await assertTestTarget({ url: targetUrl, mode: "write" });
console.log(`CIBLE_FIXTURES base=${ident.db} role=${ident.user}`);
const pool = new pg.Pool({ connectionString: targetUrl, max: 2, connectionTimeoutMillis: 30000 });

const results = [];
const check = (n, ok, d) => { results.push({ n, ok }); console.log(`${ok ? "PASS" : "FAIL"} | ${n} | ${d}`); };
const rnd = () => Math.random().toString(36).slice(2, 10);
const cleanup = [];

const cookies = (r) => (r.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
async function api(pathname, { method = "GET", body, cookie, bearer } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  const r = await fetch(`${BASE}${pathname}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined
  });
  return { r, json: await r.json().catch(() => ({})) };
}
/** Émet un JWT AVEC session enregistrée (comme l'app) — pour les scénarios. */
async function issueFixtureToken(userId, role = "user", opts = {}) {
  const jti = randomUUID();
  const exp = opts.expired
    ? new Date(Date.now() - 60_000)
    : new Date(Date.now() + 3600_000);
  await pool.query(
    "INSERT INTO user_sessions (jti, user_id, expires_at, revoked_at) VALUES ($1, $2, $3, $4)",
    [jti, userId, exp, opts.expired ? new Date() : null]);
  return jwt.sign({ id: userId, role, jti }, process.env.JWT_SECRET,
    opts.expired ? { expiresIn: "-10s" } : { expiresIn: "1h" });
}
const sessionRow = async (jti) =>
  (await pool.query("SELECT revoked_at, expires_at FROM user_sessions WHERE jti=$1", [jti])).rows[0];
const decode = (t) => jwt.decode(t);

try {
  // ============ CYCLE DE VIE ============
  const email = `v-${rnd()}@test.local`;
  let res = await api("/auth/register", { method: "POST", body: { name: "v2g7", email, password: "pwd-2g7-test" } });
  check("V1 inscription → 201", res.r.status === 201, `http=${res.r.status}`);
  cleanup.push(email);
  res = await api("/auth/login", { method: "POST", body: { email, password: "pwd-2g7-test" } });
  const c1 = cookies(res.r);
  const rawToken = decodeURIComponent((c1.split("token=")[1] || "").split(";")[0] || "");
  const jti1 = decode(rawToken)?.jti;
  check("V2 connexion → 200 + cookie (session enregistrée avec jti)", res.r.status === 200 && !!c1 && !!jti1,
    `http=${res.r.status} jti=${!!jti1}`);

  const me1 = await api("/auth/me", { cookie: c1 });
  check("V3 /auth/me avec session valide → 200", me1.r.status === 200, `http=${me1.r.status}`);

  // V4 — logout : cookie effacé ET session révoquée en base AVANT confirmation
  res = await api("/auth/logout", { method: "POST", cookie: c1 });
  const setCookies = res.r.headers.getSetCookie?.() || [];
  const cookieCleared = setCookies.some((c) =>
    /^token=;/i.test(c) || /^token=""/i.test(c) || /expires=Thu, 01 Jan 1970/i.test(c));
  const row1 = jti1 ? await sessionRow(jti1) : null;
  check("V4 logout → 200, cookie effacé, session RÉVOQUÉE en base",
    res.r.status === 200 && cookieCleared && row1?.revoked_at != null,
    `http=${res.r.status} cookie_efface=${cookieCleared} revoked_at=${row1?.revoked_at != null ? "posé" : "ABSENT"}`);

  // V5 — réutilisation du MÊME JWT après logout : refus partout
  const me2 = await api("/auth/me", { cookie: c1 });
  const meB = await api("/auth/me", { bearer: rawToken });
  check("V5 JWT révoqué refusé (cookie ET Bearer) : /me → 401",
    me2.r.status === 401 && meB.r.status === 401, `cookie=${me2.r.status} bearer=${meB.r.status}`);

  // V6 — deuxième logout : idempotent
  const again = await api("/auth/logout", { method: "POST", cookie: c1 });
  check("V6 second logout idempotent → 200", again.r.status === 200 && again.json.success === true,
    `http=${again.r.status}`);

  // V7 — JWT expiré : refus
  const u2 = await pool.query(
    "INSERT INTO users (name, email, password, role) VALUES ('v7', $1, 'x', 'user') RETURNING id",
    [`v7-${rnd()}@test.local`]);
  const u2id = u2.rows[0].id;
  const expiredTok = await issueFixtureToken(u2id, "user", { expired: true });
  const meExp = await api("/auth/me", { bearer: expiredTok });
  check("V7 JWT expiré → 401", meExp.r.status === 401, `http=${meExp.r.status}`);

  // V8 — JWT altéré ou invalide : refus
  const tampered = `${rawToken.slice(0, -3)}abc`;
  const meTam = await api("/auth/me", { bearer: tampered });
  const meGarbage = await api("/auth/me", { bearer: "pas-un-jwt" });
  check("V8 JWT altéré ou invalide → 401", meTam.r.status === 401 && meGarbage.r.status === 401,
    `altéré=${meTam.r.status} garbage=${meGarbage.r.status}`);

  // ============ SÉCURITÉ ============
  // S1 — révocation d'une session sans révoquer les autres sessions du même
  // utilisateur (politique retenue : révocation PAR SESSION)
  const uA = await pool.query(
    "INSERT INTO users (name, email, password, role) VALUES ('sa', $1, 'x', 'user') RETURNING id",
    [`sa-${rnd()}@test.local`]);
  const aId = uA.rows[0].id;
  const aTok1 = await issueFixtureToken(aId, "user");
  const aTok2 = await issueFixtureToken(aId, "user");
  await api("/auth/logout", { method: "POST", bearer: aTok1 });
  const aMe2 = await api("/auth/me", { bearer: aTok2 });
  const aMe1 = await api("/auth/me", { bearer: aTok1 });
  check("S1 logout d'une session → les AUTRES sessions restent actives",
    aMe1.r.status === 401 && aMe2.r.status === 200, `révoquée=${aMe1.r.status} autre=${aMe2.r.status}`);

  // S2 — impossible de révoquer la session d'un AUTRE utilisateur
  const uB = await pool.query(
    "INSERT INTO users (name, email, password, role) VALUES ('sb', $1, 'x', 'user') RETURNING id",
    [`sb-${rnd()}@test.local`]);
  const bId = uB.rows[0].id;
  const bTok = await issueFixtureToken(bId, "user");
  await api("/auth/logout", { method: "POST", bearer: aTok2 }); // A se déconnecte
  const bMe = await api("/auth/me", { bearer: bTok });
  check("S2 la déconnexion d'un utilisateur n'atteint pas les sessions d'autrui",
    bMe.r.status === 200, `session_B=${bMe.r.status}`);

  // S3 — identifiant de session absent/malformé : traité en toute sécurité
  const badJtiTok = jwt.sign({ id: aId, role: "user", jti: randomUUID() },
    process.env.JWT_SECRET, { expiresIn: "1h" }); // session JAMAIS enregistrée
  const numJtiTok = jwt.sign({ id: aId, role: "user", jti: 42 },
    process.env.JWT_SECRET, { expiresIn: "1h" });
  const legacyTok = jwt.sign({ id: aId, role: "user" },
    process.env.JWT_SECRET, { expiresIn: "1h" }); // ancien format SANS jti
  const rBad = await api("/auth/me", { bearer: badJtiTok });
  const rNum = await api("/auth/me", { bearer: numJtiTok });
  const rLeg = await api("/auth/me", { bearer: legacyTok });
  check("S3 session inconnue / jti malformé / JWT sans jti (ancien format) → 401",
    rBad.r.status === 401 && rNum.r.status === 401 && rLeg.r.status === 401,
    `inconnue=${rBad.r.status} malformé=${rNum.r.status} sans_jti=${rLeg.r.status}`);

  // S4 — impossible de contourner la révocation via une autre route protégée
  const adm = await pool.query(
    "INSERT INTO users (name, email, password, role) VALUES ('adm', $1, 'x', 'admin') RETURNING id",
    [`adm-${rnd()}@test.local`]);
  const admTok = await issueFixtureToken(adm.rows[0].id, "admin");
  await api("/auth/logout", { method: "POST", bearer: admTok });
  const viaUsers = await api("/users", { bearer: admTok });
  const viaSubs = await api("/subscriptions", { bearer: admTok });
  check("S4 contournement impossible : route admin ET route abonnements refusées (401)",
    viaUsers.r.status === 401 && viaSubs.r.status === 401,
    `users=${viaUsers.r.status} subs=${viaSubs.r.status}`);

  // S5 — échec de stockage des sessions : REFUS FERMÉ (jamais d'acceptation)
  await pool.query("ALTER TABLE user_sessions RENAME TO user_sessions_bak");
  const rDown = await api("/auth/me", { bearer: bTok });
  await pool.query("ALTER TABLE user_sessions_bak RENAME TO user_sessions");
  const rUp = await api("/auth/me", { bearer: bTok });
  check("S5 panne du registre de sessions → refus fermé (503), jamais 200",
    rDown.r.status === 503 && rUp.r.status === 200, `panne=${rDown.r.status} rétabli=${rUp.r.status}`);

  // S7 (Lot 2G.7.1) — panne de stockage AU LOGOUT : la révocation n'est jamais
  // contournée (503, pas de confirmation, session intacte → relogout révoque)
  const s7 = await pool.query(
    "INSERT INTO users (name, email, password, role) VALUES ('s7', $1, 'x', 'user') RETURNING id",
    [`s7-${rnd()}@test.local`]);
  const s7Tok = await issueFixtureToken(s7.rows[0].id, "user");
  await pool.query("ALTER TABLE user_sessions RENAME TO user_sessions_bak");
  const rLogoutDown = await api("/auth/logout", { method: "POST", bearer: s7Tok });
  await pool.query("ALTER TABLE user_sessions_bak RENAME TO user_sessions");
  const s7Alive = await api("/auth/me", { bearer: s7Tok }); // session intacte (non confirmée)
  const rLogoutOk = await api("/auth/logout", { method: "POST", bearer: s7Tok });
  const s7Dead = await api("/auth/me", { bearer: s7Tok });
  check("S7 panne au logout → 503 (jamais de fausse confirmation), puis révocation effective",
    rLogoutDown.r.status === 503 && s7Alive.r.status === 200 &&
    rLogoutOk.r.status === 200 && s7Dead.r.status === 401,
    `logout_panne=${rLogoutDown.r.status} session=${s7Alive.r.status} logout_ok=${rLogoutOk.r.status} après=${s7Dead.r.status}`);

  // S6 — aucun token ni secret dans les logs du serveur
  const { execSync } = await import("node:child_process");
  const leak = String(execSync(
    `grep -c 'eyJhbGciOi' /tmp/2g7*-server*.log 2>/dev/null || true`, { shell: "/bin/bash" })).trim();
  const allZero = leak.split("\n").every((l) => {
    const t = l.trim();
    return t === "" || /(?:^|:)0$/.test(t);
  });
  check("S6 logs serveur : aucune fuite de JWT (0 occurrence 'eyJ')",
    allZero, `comptages=${leak || "(aucun fichier)"}`);
} finally {
  // Nettoyage : UNIQUEMENT les données synthétiques de ce test
  for (const e of cleanup) {
    if (typeof e === "string") {
      await pool.query("DELETE FROM users WHERE email=$1", [e]).catch(() => {});
    }
  }
  await pool.query(`DELETE FROM users WHERE email LIKE 'v7-%@test.local'
     OR email LIKE 'sa-%@test.local' OR email LIKE 'sb-%@test.local'
     OR email LIKE 's7-%@test.local' OR email LIKE 'adm-%@test.local'`).catch(() => {});
  console.log("NETTOYAGE_OK données synthétiques supprimées");
  await pool.end();
}

const failed = results.filter((x) => !x.ok).length;
console.log(`\nBILAN JWT-REVOCATION: ${results.length - failed}/${results.length} PASS`);
process.exit(failed === 0 ? 0 : 1);


