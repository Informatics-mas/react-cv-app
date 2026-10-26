#!/usr/bin/env node
/**
 * Phase 5I — Audits G/H : erreurs, CORS, rate limiting et fuites.
 *
 *  E1 réponse 500 ne contient JAMAIS de stack trace ni de détail SQL
 *  E2 erreur 404 route inexistante → message JSON propre
 *  E3 CORS : origine non autorisée → pas d'en-tête ACAO permissif
 *  E4 headers de sécurité (helmet) : X-Content-Type-Options, etc.
 *  E5 rate limiting : 6e login échoué dans la fenêtre → 429
 *  E6 body JSON malformé → 400/413 sans stack
 *  E7 recherche STATIQUE de secrets dans les fichiers suivis (valeurs masquées)
 */
import { API, makePool, check, getFailures, createTestUser, purgeTestUsers } from "./helpers.js";
import { execSync } from "node:child_process";

const PORT = Number(process.argv[2] || 5000);
const BASE = API(PORT);
const pool = makePool();
const ROOT = new URL("../../", import.meta.url).pathname;

const hasStack = (txt) => /\bat\s+\w+\s+\(.*:\d+:\d+\)/.test(txt) || /node_modules/.test(txt);

try {
  // E1 — provoquer une erreur serveur via un paramètre qui casse le SQL :
  // un ID valide-format mais sur une colonne inexistante n'existe pas ; on
  // utilise plutôt /users?limit=<très grand négatif> qui peut faire échouer le
  // cast PostgreSQL → la réponse ne doit pas fuite la stack.
  let r = await fetch(`${BASE}/users?limit=${encodeURIComponent("9223372036854775807")}`);
  let txt = await r.text();
  check("E1 erreur serveur sans stack trace", !hasStack(txt), `status=${r.status}, stack=${hasStack(txt)}`);

  // E2 — 404 propre
  r = await fetch(`${BASE}/inexistante`);
  txt = await r.text();
  const body2 = JSON.parse(txt);
  check("E2 404 JSON propre", r.status === 404 && typeof body2.message === "string" && !hasStack(txt),
    `status=${r.status}, message=${JSON.stringify(body2.message).slice(0, 50)}`);

  // E3 — CORS : origine malveillante
  r = await fetch(`${BASE}/plans`, { headers: { Origin: "https://evil.example.com" } });
  const acao = r.headers.get("access-control-allow-origin") || "";
  check("E3 CORS : origine étrangère refusée", acao !== "*" && acao !== "https://evil.example.com",
    `ACAO=${JSON.stringify(acao)} (attendu absent ou origine configurée)`);

  // E4 — helmet
  r = await fetch(`${BASE}/plans`);
  const xcto = r.headers.get("x-content-type-options");
  const xf = r.headers.get("x-frame-options");
  check("E4 headers sécurité (helmet)", xcto === "nosniff" && !!xf, `x-content-type-options=${xcto}, x-frame-options=${xf}`);

  // E5 — rate limiting login : 6 échecs consécutifs → 429 (fenêtre 15 min, max 5)
  let got429 = false, lastStatus = 0;
  for (let i = 0; i < 7; i++) {
    const lr = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `phase5i-rl-${Date.now()}@test.local`, password: "mauvais" })
    });
    lastStatus = lr.status;
    if (lr.status === 429) { got429 = true; break; }
  }
  check("E5 rate limiting login actif (429 après 5 échecs)", got429, `dernier status=${lastStatus}`);

  // E6 — corps JSON malformé
  r = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{json-cassé-@@@"
  });
  txt = await r.text();
  check("E6 JSON malformé → 400/415 sans stack", (r.status === 400 || r.status === 415) && !hasStack(txt), `status=${r.status}`);

  // E7 — recherche statique de secrets (sans afficher les valeurs)
  const scan = execSync(
    `git ls-files | xargs grep -lE '(JWT_SECRET|DATABASE_URL|EMAIL_PASS|GEMINI_API_KEY|API_KEY)[[:space:]]*=[[:space:]]*[^c$"{ ]{8,}' 2>/dev/null | head -10 || true`,
    { cwd: ROOT, encoding: "utf8" }
  ).trim();
  const hits = scan.split("\n").filter((l) => l && !l.includes(".env.example"));
  check("E7 aucun secret en dur dans les fichiers suivis", hits.length === 0,
    hits.length === 0 ? "git ls-files : aucune correspondance hors .env.example" : `fichiers suspects: ${hits.join(", ")}`);
} finally {
  await pool.end();
}

console.log(getFailures() === 0 ? "\nBILAN ERREURS/SECRETS: TOUS PASS" : `\nBILAN ERREURS/SECRETS: ${getFailures()} FAIL`);
process.exitCode = getFailures() > 0 ? 1 : 0;
