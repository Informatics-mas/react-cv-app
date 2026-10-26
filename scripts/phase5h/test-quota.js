#!/usr/bin/env node
/**
 * Phase 5H — Étape E : test de l'invariant ATOMIQUE du quota de téléchargements.
 *
 * Environnement ISOLÉ : un utilisateur temporaire `phase5h-quota-*@test.local`
 * est créé par le script puis SUPPRIMÉ en fin de test (finally) — aucune donnée
 * métier existante n'est modifiée. L'écriture testée est exactement celle du
 * repository (UPDATE conditionné unique, pas de read-then-write).
 *
 * Scénarios :
 *  Q1 — 8 incréments CONCURRENTS avec quota 5 : exactement 5 succès, 3 refus,
 *       downloads_used final = 5 (jamais plus).
 *  Q2 — HTTP POST /api/downloads/authorize (serveur réel) : 200 tant que le
 *       quota reste, 403 QUOTA_EXCEEDED ensuite, 401 avec token invalide.
 *  Q3 — aucun incrément fantôme quand la requête est refusée/échouée.
 *
 * Usage : node scripts/phase5h/test-quota.js [PORT_SERVEUR=5000]
 * Nécessite : Backend/.env (DATABASE_URL + JWT_SECRET).
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertTestTarget } from "../lib/safe-target.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../Backend/package.json"));
require("dotenv").config({ path: path.join(here, "../../Backend/.env") });
const pg = require("pg");
const jwt = require("jsonwebtoken");

const API_PORT = Number(process.argv[2] || 5000);
const API = `http://localhost:${API_PORT}/api`;
const LIMIT = 5;
const CONCURRENCY = 8;

// Lot 2G.4F — cible EXPLICITE + identité réelle vérifiée avant toute écriture.
const targetUrl = process.env.CVC_TEST_DB_URL;
await assertTestTarget({ url: targetUrl, mode: "write" });

const pool = new pg.Pool({
  connectionString: targetUrl,
  ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: true } : undefined,
  max: CONCURRENCY,
  // Harnais de test : TLS froid vers Supabase atteint 20-30 s dans cet
  // environnement (mesuré Phase 5H T1/T3) — le pool de production reste à 30 s.
  connectionTimeoutMillis: 60_000
});

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | ${detail}`);
};

// Copie CONFORME de usersRepo.incrementDownloadIfBelow (Backend/db/repositories/users.js)
// — UPDATE atomique conditionné, source de vérité du quota.
function incrementDownloadIfBelow(id, limit) {
  return pool.query(
    `UPDATE users
        SET downloads_used = downloads_used + 1
      WHERE id = $2
        AND downloads_used < $1
      RETURNING *`,
    [limit, id]
  );
}

async function main() {
  // --- Création de l'utilisateur temporaire isolé ---
  const suffix = Date.now().toString(36);
  const email = `phase5h-quota-${suffix}@test.local`;
  const { rows: [user] } = await pool.query(
    `INSERT INTO users (name, email, password, role, user_plan, user_max_downloads, downloads_used)
     VALUES ($1, $2, 'phase5h-no-login', 'user', 'Free', $3, 0)
     RETURNING id`,
    [`Phase5H Quota ${suffix}`, email, LIMIT]
  );
  const userId = user.id;
  console.log(`Utilisateur temporaire créé : id=${userId} (${email}), quota=${LIMIT}`);
  console.log(`--- Q1 : ${CONCURRENCY} incréments concurrents, quota ${LIMIT} ---`);

  try {
    // ========== Q1 : concurrence pure (niveau repository/SQL) ==========
    const outcomes = await Promise.all(
      Array.from({ length: CONCURRENCY }, () =>
        incrementDownloadIfBelow(userId, LIMIT)
          .then((r) => (r.rowCount === 1 ? "ok" : "refus"))
          .catch((e) => { console.log("   erreur requête:", e.code || "", e.message); return "erreur"; })
      )
    );
    const ok = outcomes.filter((o) => o === "ok").length;
    const refus = outcomes.filter((o) => o === "refus").length;
    const errs = outcomes.filter((o) => o === "erreur").length;
    const { rows: [{ used }] } = await pool.query(
      "SELECT downloads_used::int AS used FROM users WHERE id = $1", [userId]
    );
    check("Q1 quota atomique concurrent", ok === LIMIT && refus === CONCURRENCY - LIMIT && errs === 0 && used === LIMIT,
      `${CONCURRENCY} concurrentes → succès=${ok} refus=${refus} erreurs=${errs}, downloads_used final=${used} (attendu succès=${LIMIT}, refus=${CONCURRENCY - LIMIT}, used=${LIMIT})`);

    const extra = await incrementDownloadIfBelow(userId, LIMIT);
    check("Q1 bis refus systématique au-delà du quota", extra.rowCount === 0,
      `nouvel appel après épuisement → rowCount=${extra.rowCount} (attendu 0)`);

    // ========== Q2 : parcours HTTP réel (serveur + JWT existants) ==========
    console.log(`--- Q2 : HTTP ${API}/downloads/authorize ---`);
    let serverUp = false;
    try {
      const r = await fetch(`http://localhost:${API_PORT}/`);
      serverUp = r.status < 500;
    } catch { serverUp = false; }

    if (!serverUp) {
      check("Q2 parcours HTTP", false, `serveur injoignable sur le port ${API_PORT} — démarrer Backend/server.js puis relancer`);
    } else {
      // Token du mécanisme JWT existant + session enregistrée (Lot 2G.7).
      const { randomUUID } = await import("node:crypto");
      const jti = randomUUID();
      await pool.query(
        "INSERT INTO user_sessions (jti, user_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')",
        [jti, userId]);
      const token = jwt.sign({ id: userId, role: "user", jti }, process.env.JWT_SECRET, { expiresIn: "1h" });
      // Reset du compteur pour observer le parcours complet côté HTTP
      await pool.query("UPDATE users SET downloads_used = 0 WHERE id = $1", [userId]);

      const authed = () => fetch(`${API}/downloads/authorize`, {
        method: "POST",
        headers: { Cookie: `token=${token}` }
      });

      // 8 requêtes PARALLÈLES sur quota 5
      const responses = await Promise.all(
        Array.from({ length: CONCURRENCY }, async () => {
          try {
            const r = await authed();
            const body = await r.json().catch(() => ({}));
            return { status: r.status, code: body.code || null };
          } catch (e) {
            return { status: 0, code: e.message };
          }
        })
      );
      const s200 = responses.filter((r) => r.status === 200).length;
      const s403 = responses.filter((r) => r.status === 403 && r.code === "QUOTA_EXCEEDED").length;
      const sOther = responses.filter((r) => r.status !== 200 && r.status !== 403).length;
      const { rows: [{ used: used2 }] } = await pool.query(
        "SELECT downloads_used::int AS used FROM users WHERE id = $1", [userId]
      );
      check("Q2 HTTP : 8 parallèles → 5×200 + 3×403 QUOTA_EXCEEDED", s200 === LIMIT && s403 === CONCURRENCY - LIMIT && sOther === 0 && used2 === LIMIT,
        `200=${s200} 403=${s403} autres=${sOther}, downloads_used=${used2} (attendu 200=5, 403=3, used=5)`);

      // 401 : token invalide → NE DOIT PAS consommer de quota
      const before = used2;
      const bad = await fetch(`${API}/downloads/authorize`, {
        method: "POST",
        headers: { Cookie: "token=jeton-invalide" }
      });
      const { rows: [{ used: afterBad }] } = await pool.query(
        "SELECT downloads_used::int AS used FROM users WHERE id = $1", [userId]
      );
      check("Q2 bis : 401 token invalide sans consommation", bad.status === 401 && afterBad === before,
        `status=${bad.status} (attendu 401), downloads_used ${before}→${afterBad} (inchangé)`);

      // Q3 : aucun incrément fantôme quand la requête est refusée (quota épuisé)
      const beforeQ3 = afterBad;
      const one = await authed(); // quota épuisé → 403 attendu
      const { rows: [{ used: afterQ3 }] } = await pool.query(
        "SELECT downloads_used::int AS used FROM users WHERE id = $1", [userId]
      );
      check("Q3 : aucun incrément fantôme sur refus/échec", one.status === 403 && afterQ3 === beforeQ3,
        `statut=${one.status} (attendu 403), downloads_used stable=${afterQ3}`);
    }
  } finally {
    // --- Nettoyage : suppression de l'utilisateur temporaire ---
    const { rowCount } = await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    console.log(`Nettoyage : utilisateur temporaire supprimé (lignes=${rowCount}).`);
    await pool.end();
  }

  console.log(failures === 0 ? "\nBILAN QUOTA: TOUS PASS" : `\nBILAN QUOTA: ${failures} FAIL`);
  process.exitCode = failures > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error("ERREUR FATALE:", e.code || "", e.message);
  process.exitCode = 1;
});
