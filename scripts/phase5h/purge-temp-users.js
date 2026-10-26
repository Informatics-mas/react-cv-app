#!/usr/bin/env node
/**
 * Phase 5H — filet de sécurité : suppression des utilisateurs TEMPORAIRES de
 * test (emails phase5h-*@test.local) qui subsisteraient après un test interrompu.
 * Ne touche JAMAIS les comptes qui ne matchent pas ce préfixe.
 *
 * ═══ LOT 2G.4F — OPÉRATION DESTRUCTIVE : BLOQUÉE PAR DÉFAUT ═══
 * Prérequis cumulatifs (sinon REFUS explicite, avant toute connexion) :
 *   1. CVC_TEST_DB_URL      — cible EXPLICITE (jamais de DATABASE_URL héritée ;
 *                             ce script ne lit aucun .env) ;
 *   2. CVC_PURGE_CONFIRM    — exactement « CONFIRME-PURGE-CVC-DISPOSABLE » ;
 *   3. garde de cible       — hôte autorisé, base non persistante, identité
 *                             réelle confirmée par connexion (scripts/lib/
 *                             safe-target.js) ;
 *   4. périmètre            — UNIQUEMENT email LIKE 'phase5h-%@test.local'
 *                             (vérifié par comptage avant suppression).
 * TLS strict (rejectUnauthorized: true) — jamais de désactivation.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertTestTarget, strictSslOptions, PURGE_CONFIRM_TOKEN } from "../lib/safe-target.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../Backend/package.json"));
const pg = require("pg");

// ── Garde 1 : confirmation non ambiguë (par défaut : REFUS) ──
if (process.env.CVC_PURGE_CONFIRM !== PURGE_CONFIRM_TOKEN) {
  console.error("REFUS : purge désactivée par défaut.");
  console.error(`  → définir CVC_PURGE_CONFIRM=${PURGE_CONFIRM_TOKEN} pour une base jetable dédiée,`);
  console.error("  → ainsi que CVC_TEST_DB_URL=<url-explicite-de-la-base-jetable>.");
  process.exit(2);
}

// ── Garde 2 : cible explicite + identité réelle (aucune mutation avant) ──
const targetUrl = process.env.CVC_TEST_DB_URL;
let identite;
try {
  identite = await assertTestTarget({ url: targetUrl, mode: "write" });
} catch (e) {
  console.error(String(e.message));
  process.exit(2);
}
console.log(`CIBLE_VERIFIEE base=${identite.db} role=${identite.user} serveur=${identite.server}`);

const pool = new pg.Pool({
  connectionString: targetUrl,
  ssl: strictSslOptions(),
  max: 1,
  connectionTimeoutMillis: 60_000
});

// ── Garde 3 : périmètre de suppression compté AVANT toute suppression ──
const SCOPE = "phase5h-%@test.local";
const { rows: [{ cibles }] } = await pool.query(
  "SELECT count(*)::int AS cibles FROM users WHERE email LIKE $1", [SCOPE]);
const { rows: [{ total }] } = await pool.query("SELECT count(*)::int AS total FROM users");
console.log(`Périmètre '${SCOPE}' : ${cibles} compte(s) cible(s) sur ${total} utilisateur(s).`);
if (cibles === total && total > 0) {
  console.error("REFUS : le périmètre couvrirait TOUS les comptes — opération interrompue.");
  await pool.end();
  process.exit(2);
}

const { rows } = await pool.query(
  "DELETE FROM users WHERE email LIKE $1 RETURNING id, email", [SCOPE]);
console.log(`Purge : ${rows.length} utilisateur(s) temporaire(s) supprimé(s).`);
for (const r of rows) console.log(" -", r.id, r.email);
const { rows: [{ n }] } = await pool.query("SELECT count(*)::int AS n FROM users");
console.log("TOTAL_USERS restant:", n);
await pool.end();

