#!/usr/bin/env node
/**
 * Lot 2G — tests de suppression de plans (régression du correctif PLAN_HAS_SUBSCRIPTIONS).
 * 1. plan référencé par un abonnement → 409 PLAN_HAS_SUBSCRIPTIONS (données intactes)
 * 2. plan inconnu → 404
 * 3. plan libre → 200 (puis restauration sur base de test)
 * 4. non-admin → 403 ; anonyme → 401
 * 5. réponse 409 sans fuite interne
 * Usage : DATABASE_URL=<cvc_admin> node scripts/phase5j/test-plan-delete.js [PORT=5000]
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
const delPlan = (id, token) =>
  fetch(`${API}/plans/${id}`, { method: "DELETE", headers: token ? { Authorization: `Bearer ${token}` } : {} });

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
    console.log("FIXTURE_OK admin synthétique créé (prérequis explicite plan-delete)");
  }
}
try {
  const { rows: [{ id: adminId }] } = await pool.query("SELECT id FROM users WHERE role='admin' ORDER BY created_at LIMIT 1");
  const adminTok = await sign(adminId, "admin");
  const s = Date.now().toString(36);
  const { rows: [{ id: uid }] } = await pool.query(
    "INSERT INTO users (name,email,password,role) VALUES ($1,$2,'x','user') RETURNING id",
    [`PlanDel ${s}`, `phase5c-plandel-${s}@test.local`]);
  const userTok = await sign(uid, "user");

  // 1. Plan RÉFÉRENCÉ → 409 PLAN_HAS_SUBSCRIPTIONS
  const { rows: [{ id: basicId }] } = await pool.query("SELECT id FROM plans WHERE name='Basic'");
  await pool.query(
    "INSERT INTO subscriptions (user_id,plan_id,start_date,end_date,status,auto_renew) VALUES ($1,$2,now(),now()+interval '30 days','active',false)", [uid, basicId]);
  const r1 = await delPlan(basicId, adminTok);
  const b1 = await r1.text();
  const { rows: [chk] } = await pool.query(
    "SELECT (SELECT count(*)::int FROM plans WHERE id=$1) AS p, (SELECT count(*)::int FROM subscriptions WHERE plan_id=$1) AS s", [basicId]);
  const leak = /23503|foreign|constraint|violates|pg_/i.test(b1);
  let code1 = null;
  try { code1 = JSON.parse(b1).code; } catch { /* non-JSON */ }
  check("PL-1 plan référencé → 409 PLAN_HAS_SUBSCRIPTIONS, données intactes, sans fuite",
    r1.status === 409 && code1 === "PLAN_HAS_SUBSCRIPTIONS" && chk.p === 1 && chk.s >= 1 && !leak,
    `http=${r1.status} code=${code1} plan=${chk.p} subs=${chk.s} leak=${leak}`);

  // 2. Plan inconnu → 404
  const r2 = await delPlan("00000000-0000-4000-8000-000000000000", adminTok);
  check("PL-2 plan inconnu → 404", r2.status === 404, `http=${r2.status}`);

  // 3. Plan libre → 200 + restauration
  const { rows: [prem] } = await pool.query("SELECT * FROM plans WHERE name='Premium'");
  const r3 = await delPlan(prem.id, adminTok);
  const { rows: [{ n: gone }] } = await pool.query("SELECT count(*)::int AS n FROM plans WHERE name='Premium'");
  await pool.query(
    "INSERT INTO plans (name,price,duree,features,description,is_popular,max_downloads) VALUES ('Premium',$1,$2,$3,$4,$5,$6)",
    [prem.price, prem.duree, prem.features, prem.description, prem.is_popular, prem.max_downloads]);
  const { rows: [{ n: back }] } = await pool.query("SELECT count(*)::int AS n FROM plans WHERE name='Premium'");
  check("PL-3 plan libre → 200 + supprimé puis restauré (base de test)",
    r3.status === 200 && gone === 0 && back === 1, `http=${r3.status} supprimé=${gone} restauré=${back}`);

  // 4. Autorisations
  const r4 = await delPlan(basicId, userTok);
  const r5 = await delPlan(basicId, null);
  check("PL-4 non-admin → 403 ; anonyme → 401 (jamais de suppression)",
    r4.status === 403 && r5.status === 401, `user=${r4.status} anonyme=${r5.status}`);

  // 5. A6 : l'utilisateur de test (abonnement seul) reste supprimable — nettoyage
  await pool.query("DELETE FROM subscriptions WHERE user_id=$1", [uid]);
  await pool.query("DELETE FROM users WHERE id=$1", [uid]);
  console.log("NETTOYAGE_OK");
} finally {
  await pool.end();
}
console.log(failures === 0 ? "\nBILAN PLAN-DELETE: TOUS PASS" : `\nBILAN PLAN-DELETE: ${failures} FAIL`);
process.exit(failures > 0 ? 1 : 0);
