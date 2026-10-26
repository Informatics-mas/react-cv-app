#!/usr/bin/env node
/**
 * Phase 5J-D — validation de la chaîne d'upload (multer 2.4.0 après mise à jour).
 * Utilisateur temporaire PREMIUM (souscription insérée en SQL, CASCADE au
 * nettoyage). Envoi d'un fichier NON-PDF : multer doit le refuser via fileFilter
 * SANS jamais atteindre l'appel Gemini externe (le refus est antérieur).
 * Attendu : réponse non-200, JSON sans stack trace.
 */
import { API, makePool, check, getFailures, createTestUser, purgeTestUsers, signToken } from "../phase5i/helpers.js";

const PORT = Number(process.argv[2] || 5000);
const BASE = API(PORT);
const pool = makePool();

const user = await createTestUser(pool, { suffix: "-upload" });
const { rows: [premium] } = await pool.query("SELECT id FROM plans WHERE name = 'Premium'");
await pool.query(
  `INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, status, auto_renew)
   VALUES ($1, $2, now(), now() + interval '30 days', 'active', false)`,
  [user.id, premium.id]
);
const tok = signToken(user.id, "user");

try {
  const fd = new FormData();
  fd.append("cv_file", new Blob(["ceci n'est pas un pdf"], { type: "text/plain" }), "fake.txt");
  const r = await fetch(`${BASE}/parse-cv`, { method: "POST", headers: { Cookie: `token=${tok}` }, body: fd });
  const txt = await r.text();
  const hasStack = /\bat\s+\w+\s+\(.*:\d+:\d+\)/.test(txt) || /node_modules/.test(txt);
  check("U1 fichier non-PDF refusé par multer (fileFilter)", r.status !== 200 && !hasStack,
    `status=${r.status} (attendu 4xx/5xx sans appel Gemini ni stack)`);

  // Contrôle : sans fichier du tout → refus propre
  const r2 = await fetch(`${BASE}/parse-cv`, { method: "POST", headers: { Cookie: `token=${tok}` } });
  check("U2 requête sans fichier → refus propre", r2.status >= 400 && r2.status < 600,
    `status=${r2.status}`);
} finally {
  const n = await purgeTestUsers(pool);
  console.log(`Nettoyage : ${n} utilisateur(s) phase5i supprimé(s) (souscription CASCADE).`);
  await pool.end();
}

console.log(getFailures() === 0 ? "\nBILAN UPLOAD: TOUS PASS" : `\nBILAN UPLOAD: ${getFailures()} FAIL`);
process.exitCode = getFailures() > 0 ? 1 : 0;
