#!/usr/bin/env node
/**
 * Phase 5H — Étape F : tests de stabilité CONTRÔLÉS du pool PostgreSQL
 * (Session Pooler Supabase). LECTURE SEULE — aucune écriture métier.
 *
 * Scénarios :
 *  T1 connexion froide (latence de la toute première connexion TLS)
 *  T2 série de requêtes séquentielles (latence médiane / p95)
 *  T3 requêtes concurrentes limitées (8)
 *  T4 réutilisation du pool après inactivité (> idleTimeoutMillis)
 *  T5 connexion interrompue simulée (socket détruite) + reprise du pool
 *  T6 fermeture propre du pool (pool.end())
 *
 * Sortie : tableau de résultats + codes d'erreur PostgreSQL rencontrés.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../Backend/package.json"));
require("dotenv").config({ path: path.join(here, "../../Backend/.env") });
const pg = require("pg");

// --- Le VRAI module de production (Backend/db/pool.js, corrections Phase 5H incluses) ---
const { pool, withTransaction } = await import(path.join(here, "../../Backend/db/pool.js"));

const pgErrors = [];
pool.on("error", (err) => pgErrors.push({ code: err.code || null, message: err.message }));

const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | ${detail}`);
};

const stats = (latencies) => {
  const s = [...latencies].sort((a, b) => a - b);
  const med = s[Math.floor(s.length / 2)];
  const p95 = s[Math.min(s.length - 1, Math.floor(s.length * 0.95))];
  return `n=${s.length} min=${s[0]}ms médiane=${med}ms p95=${p95}ms max=${s[s.length - 1]}ms`;
};

async function main() {
  // --- T1 : connexion froide ---
  let t = Date.now();
  await pool.query("SELECT 1 AS ok");
  const coldMs = Date.now() - t;
  record("T1 connexion froide (première connexion TLS)", coldMs < 30_000, `premier SELECT 1 en ${coldMs}ms`);

  // --- T2 : 15 requêtes séquentielles ---
  const seq = [];
  let seqOk = 0;
  for (let i = 0; i < 15; i++) {
    t = Date.now();
    try {
      const { rows } = await pool.query("SELECT 1 AS ok");
      if (rows[0].ok === 1) seqOk++;
    } catch (e) {
      pgErrors.push({ code: e.code || null, message: e.message });
    }
    seq.push(Date.now() - t);
  }
  record("T2 requêtes séquentielles (15)", seqOk === 15, `${seqOk}/15 succès — ${stats(seq)}`);

  // --- T3 : 8 requêtes concurrentes (plafond max=8 du pool) ---
  const conc = [];
  const tasks = Array.from({ length: 8 }, async () => {
    const st = Date.now();
    try {
      const { rows } = await pool.query("SELECT 1 AS ok");
      conc.push(Date.now() - st);
      return rows[0].ok === 1;
    } catch (e) {
      pgErrors.push({ code: e.code || null, message: e.message });
      conc.push(Date.now() - st);
      return false;
    }
  });
  const concOk = (await Promise.all(tasks)).filter(Boolean).length;
  record("T3 requêtes concurrentes (8)", concOk === 8, `${concOk}/8 succès — ${stats(conc)}`);

  // --- T4 : inactivité 35 s (> idleTimeoutMillis=30s) puis reprise ---
  console.log("... T4 : attente d'inactivité de 35 s ...");
  await new Promise((r) => setTimeout(r, 35_000));
  t = Date.now();
  try {
    const { rows } = await pool.query("SELECT 1 AS ok");
    record("T4 reprise après inactivité 35s", rows[0].ok === 1, `SELECT 1 en ${Date.now() - t}ms`);
  } catch (e) {
    record("T4 reprise après inactivité 35s", false, `ERREUR ${e.code || ""} ${e.message}`);
  }

  // --- T5 : connexion interrompue simulée (destruction du socket d'un client acquis) ---
  const client = await pool.connect();
  // Destruction brutale du socket TCP = "Connection terminated unexpectedly" simulée
  // (aucun impact hors de ce processus de test).
  client.connection?.stream?.destroy();
  let destroyed = false;
  try {
    await client.query("SELECT 1");
  } catch (e) {
    destroyed = true;
    pgErrors.push({ code: e.code || null, message: e.message });
    console.log(`   (T5) erreur attendue sur client détruit : ${e.code || ""} ${e.message}`);
  }
  try {
    client.release();
  } catch { /* déjà rendu/erreur */ }
  // Le pool doit recycler et répondre normalement juste après
  t = Date.now();
  try {
    const { rows } = await pool.query("SELECT 1 AS ok");
    record("T5 reprise du pool après coupure socket", destroyed && rows[0].ok === 1,
      `coupure simulée=${destroyed}, SELECT 1 suivant en ${Date.now() - t}ms`);
  } catch (e) {
    record("T5 reprise du pool après coupure socket", false, `ERREUR ${e.code || ""} ${e.message}`);
  }

  // --- T5bis : transaction interrompue (withTransaction — chemin /subscribe) ---
  try {
    await withTransaction(async (client) => {
      await client.query("SELECT 1");
      // Coupure du socket PENDANT la transaction (client acquis) — scénario
      // exact qui crashait le processus avant correction.
      client.connection?.stream?.destroy();
      await new Promise((r) => setTimeout(r, 200));
      await client.query("SELECT 1");
    });
    record("T5bis transaction interrompue (withTransaction)", false, "la transaction aurait dû échouer");
  } catch (e) {
    pgErrors.push({ code: e.code || null, message: e.message });
    record("T5bis transaction interrompue (withTransaction)", true,
      `erreur propagée (${e.code || ""} ${e.message}) — ROLLBACK/release sans crash`);
  }
  // Le client mort ne doit PAS être réutilisé : la requête suivante passe sur un client neuf
  t = Date.now();
  try {
    const { rows } = await pool.query("SELECT 1 AS ok");
    record("T5bis reprise après transaction interrompue", rows[0].ok === 1, `SELECT 1 en ${Date.now() - t}ms`);
  } catch (e) {
    record("T5bis reprise après transaction interrompue", false, `ERREUR ${e.code || ""} ${e.message}`);
  }

  // --- T6 : fermeture propre ---
  t = Date.now();
  await pool.end();
  record("T6 fermeture propre (pool.end)", true, `pool fermé en ${Date.now() - t}ms`);

  console.log("\n--- Erreurs PostgreSQL capturées par pool.on('error') ---");
  console.log(pgErrors.length ? JSON.stringify(pgErrors, null, 2) : "(aucune)");
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nBILAN: ${results.length - failed}/${results.length} scénarios PASS`);
  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error("ERREUR FATALE:", e.code || "", e.message);
  process.exitCode = 1;
});
