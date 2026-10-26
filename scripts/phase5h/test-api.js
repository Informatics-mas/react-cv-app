#!/usr/bin/env node
/**
 * Phase 5H — Étape I : régression API complète contre le serveur réel.
 * Utilisateurs temporaires isolés (créés puis supprimés par le script).
 *
 *  R1  register + login + /auth/me (cookie httpOnly)          → 201/200/200
 *  R2  /auth/me SANS cookie                                    → 401 (pas 500)
 *  R3  /auth/me avec token CORROMPU                            → 401 (pas 500)
 *  R4  /users (admin requis) : user normal → 403, admin → 200
 *  R5  GET /plans public                                       → 200
 *  R6  POST /subscriptions/subscribe (plan gratuit)            → 201 + cohérence /auth/me
 *  R7  GET /stats/dashboard-stats (admin)                      → 200
 *  R8  distinction 403 (user) vs 401 (anonyme) vs 404 (route)  → codes corrects
 *
 * Usage : node scripts/phase5h/test-api.js [PORT=5000]
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

const API_PORT = Number(process.argv[2] || 5000);
const BASE = `http://localhost:${API_PORT}/api`;

// Lot 2G.4F — cible EXPLICITE + identité réelle vérifiée avant toute écriture.
const targetUrl = process.env.CVC_TEST_DB_URL;
await assertTestTarget({ url: targetUrl, mode: "write" });

const pool = new pg.Pool({
  connectionString: targetUrl,
  ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: true } : undefined,
  max: 2,
  // Harnais de test uniquement : TLS froid vers Supabase atteint 20-30 s dans
  // cet environnement (mesuré T1/T3) — le pool de production reste à 30 s.
  connectionTimeoutMillis: 60_000
});

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | ${detail}`);
};

const suffix = Date.now().toString(36);
const userCreds = { name: `Phase5H API ${suffix}`, email: `phase5h-api-${suffix}@test.local`, password: "Phase5H!pass75" };
const adminCreds = { name: `Phase5H Admin ${suffix}`, email: `phase5h-adm-${suffix}@test.local`, password: "Phase5H!pass75" };

async function main() {
  const created = [];
  try {
    // --- R5 : plans publics (SANS auth) ---
    // responseFormat enveloppe les tableaux en { success, data: [...] } — les deux formes sont acceptées.
    let r = await fetch(`${BASE}/plans`);
    const plansBody = await r.json().catch(() => []);
    const plans = Array.isArray(plansBody) ? plansBody : (plansBody.data ?? []);
    const freePlan = Array.isArray(plans) ? plans.find((p) => p.name === "Free") : null;
    check("R5 GET /plans public", r.status === 200 && !!freePlan,
      `status=${r.status}, plan Free ${freePlan ? "trouvé (maxDownloads=" + freePlan.maxDownloads + ")" : "ABSENT"}`);

    // --- R1 : register ---
    r = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userCreds)
    });
    const regBody = await r.json().catch(() => ({}));
    check("R1 register", r.status === 201 && !!regBody.user?.id, `status=${r.status} (attendu 201)`);

    // --- R1 : login (cookie httpOnly récupéré) ---
    r = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userCreds.email, password: userCreds.password })
    });
    const setCookie = r.headers.get("set-cookie") || "";
    const cookie = setCookie.split(";")[0];
    check("R1 login + cookie httpOnly", r.status === 200 && cookie.startsWith("token=") && /HttpOnly/i.test(setCookie),
      `status=${r.status}, cookie=${cookie ? "présent" : "absent"}, HttpOnly=${/HttpOnly/i.test(setCookie)}`);

    // --- R1 : /auth/me avec cookie ---
    r = await fetch(`${BASE}/auth/me`, { headers: { Cookie: cookie } });
    const me = await r.json().catch(() => ({}));
    check("R1 /auth/me avec session", r.status === 200 && me.email === userCreds.email,
      `status=${r.status}, plan=${me.user_plan}, quota=${me.subscription?.maxDownloads}/${me.subscription?.downloadsUsed}`);

    // --- R2 : /auth/me SANS cookie → 401 ---
    r = await fetch(`${BASE}/auth/me`);
    check("R2 /auth/me anonyme → 401", r.status === 401, `status=${r.status} (attendu 401)`);

    // --- R3 : token corrompu → 401 (jamais 500) ---
    r = await fetch(`${BASE}/auth/me`, { headers: { Cookie: "token=abc.def.ghi" } });
    check("R3 /auth/me token corrompu → 401", r.status === 401, `status=${r.status} (attendu 401)`);

    // --- R8 : route inexistante → 404 ---
    r = await fetch(`${BASE}/route-qui-nexiste-pas`);
    check("R8 route inexistante → 404", r.status === 404, `status=${r.status} (attendu 404)`);

    // --- R4/R7 : admin temporaire créé en base (hash bcrypt identique à AuthRoute) ---
    const hash = await bcrypt.hash(adminCreds.password, 10);
    const { rows: [adm] } = await pool.query(
      `INSERT INTO users (name, email, password, role, user_plan, user_max_downloads, downloads_used)
       VALUES ($1, $2, $3, 'admin', 'Free', 5, 0) RETURNING id`,
      [adminCreds.name, adminCreds.email, hash]
    );
    created.push(adm.id);

    r = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminCreds.email, password: adminCreds.password })
    });
    const adminCookie = (r.headers.get("set-cookie") || "").split(";")[0];
    check("R4 login admin", r.status === 200 && adminCookie.startsWith("token="), `status=${r.status}`);

    // user normal sur endpoint admin → 403 (PAS 401 : la session est valide)
    r = await fetch(`${BASE}/users`, { headers: { Cookie: cookie } });
    check("R4 /users avec user normal → 403", r.status === 403, `status=${r.status} (attendu 403)`);

    // admin → 200
    r = await fetch(`${BASE}/users`, { headers: { Cookie: adminCookie } });
    check("R4 /users avec admin → 200", r.status === 200, `status=${r.status} (attendu 200)`);

    r = await fetch(`${BASE}/stats/dashboard-stats`, { headers: { Cookie: adminCookie } });
    const stats = await r.json().catch(() => ({}));
    check("R7 /stats/dashboard-stats admin → 200", r.status === 200 && typeof stats.users === "number",
      `status=${r.status}, users=${stats.users}, subs=${stats.subs}`);

    // --- R6 : souscription au plan gratuit (transaction avec COMMIT) ---
    if (freePlan) {
      r = await fetch(`${BASE}/subscriptions/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ planId: freePlan._id, paymentMethod: "free" })
      });
      const subBody = await r.json().catch(() => ({}));
      check("R6 subscribe (plan gratuit)", r.status === 201 && !!subBody.subscription,
        `status=${r.status} (attendu 201)`);

      // Cohérence : /auth/me reflète l'abonnement (entitlements)
      r = await fetch(`${BASE}/auth/me`, { headers: { Cookie: cookie } });
      const me2 = await r.json().catch(() => ({}));
      check("R6 bis /auth/me cohérent après subscribe", r.status === 200 && me2.subscription?.plan === "Free",
        `status=${r.status}, plan=${me2.subscription?.plan}, statut=${me2.subscription?.status}, downloadsUsed=${me2.subscription?.downloadsUsed}`);
    } else {
      check("R6 subscribe (plan gratuit)", false, "plan Free introuvable dans /plans — scénario non exécutable");
    }
  } finally {
    // Nettoyage : suppression des utilisateurs temporaires (CASCADE vire subs/payments)
    for (const id of created) {
      await pool.query("DELETE FROM users WHERE id = $1", [id]);
    }
    const { rowCount } = await pool.query("DELETE FROM users WHERE email = $1 OR email = $2",
      [userCreds.email, adminCreds.email]);
    console.log(`Nettoyage : ${created.length + rowCount} utilisateur(s) temporaire(s) supprimé(s).`);
    await pool.end();
  }

  console.log(failures === 0 ? "\nBILAN API: TOUS PASS" : `\nBILAN API: ${failures} FAIL`);
  process.exitCode = failures > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error("ERREUR FATALE:", e.code || "", e.message);
  process.exitCode = 1;
});

