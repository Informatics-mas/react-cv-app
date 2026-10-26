#!/usr/bin/env node
/**
 * Phase 5H — Étape D/F9 : comportement d'auth quand la base est INDISPONIBLE.
 * Le serveur cible doit tourner avec une DATABASE_URL injoignable (test lancé
 * par le shell avec override d'env — le .env n'est jamais modifié).
 *
 *  D1 — /auth/me avec JWT VALIDE + base en panne → 503 DB_UNAVAILABLE (jamais 401)
 *  D2 — /auth/me avec JWT INVALIDE + base en panne → 401 (le JWT prime)
 *
 * Le JWT est signé avec le mécanisme existant (JWT_SECRET) — aucun changement.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../Backend/package.json"));
require("dotenv").config({ path: path.join(here, "../../Backend/.env") });
const jwt = require("jsonwebtoken");

const PORT = Number(process.argv[2] || 5001);
const USER_ID = process.argv[3]; // UUID d'un utilisateur existant (claim `id`)
if (!USER_ID) {
  console.error("Usage : node test-degraded.js <PORT> <USER_UUID>");
  process.exit(1);
}

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | ${detail}`);
};

const token = jwt.sign({ id: USER_ID, role: "user" }, process.env.JWT_SECRET, { expiresIn: "1h" });
const t0 = Date.now();
const r1 = await fetch(`http://localhost:${PORT}/api/auth/me`, {
  headers: { Cookie: `token=${token}` }
});
const body1 = await r1.json().catch(() => ({}));
check("D1 /auth/me JWT valide + DB en panne → 503", r1.status === 503 && body1.code === "DB_UNAVAILABLE",
  `status=${r1.status} code=${body1.code || "∅"} (attendu 503 DB_UNAVAILABLE — JAMAIS 401), durée=${Date.now() - t0}ms (retries bornés inclus)`);

const r2 = await fetch(`http://localhost:${PORT}/api/auth/me`, {
  headers: { Cookie: "token=jeton-invalide" }
});
check("D2 /auth/me JWT invalide → 401 (prioritaire)", r2.status === 401,
  `status=${r2.status} (attendu 401)`);

console.log(failures === 0 ? "\nBILAN DEGRADED: TOUS PASS" : `\nBILAN DEGRADED: ${failures} FAIL`);
process.exitCode = failures > 0 ? 1 : 0;
