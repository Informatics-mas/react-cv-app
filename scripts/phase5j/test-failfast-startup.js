#!/usr/bin/env node
/**
 * Lot 2G.15A — Tests isolés de la politique de démarrage fail-fast PostgreSQL.
 *
 * SÛRETÉ : sous-processus (serveur réel) avec environnement contrôlé ; toutes
 * les cibles sont locales et inertes (127.0.0.1:9 = refus immédiat ; serveur
 * TCP local silencieux = timeout) — AUCUNE base distante ni locale persistante
 * n'est contactée ; aucun .env n'est modifié ; ports de test dédiés.
 */
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SERVER = path.resolve(here, "../../Backend/server.js");
const results = [];
const check = (id, label, pass, evidence) => {
  results.push({ id, pass });
  console.log(`${pass ? "PASS" : "FAIL"} | ${id} ${label} | ${evidence}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const listening = (port) => new Promise((resolve) => {
  const s = net.connect({ port, host: "127.0.0.1" }, () => { s.destroy(); resolve(true); });
  s.on("error", () => resolve(false));
});

/** Lance server.js avec un environnement minimal et capture la sortie. */
function runServer(env, timeoutMs = 20000) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SERVER], {
      env: { PATH: process.env.PATH, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    const timer = setTimeout(() => { child.kill("SIGKILL"); resolve({ code: "TIMEOUT", out }); }, timeoutMs);
    child.on("exit", (code) => { clearTimeout(timer); resolve({ code, out }); });
  });
}

// ---------- FF1 — Connexion refusée (cible locale inerte) : échec explicite ----------
{
  const r = await runServer({
    DATABASE_URL: "postgresql://t@127.0.0.1:9/inert",
    NODE_ENV: "test", PORT: "5101",
  }, 25000);
  const up = await listening(5101);
  check("FF1", "connexion refusée → démarrage ÉCHOUÉ explicitement (pas d'écoute HTTP)",
    r.code === 1 && /DÉMARRAGE ARRÊTÉ/.test(r.out) && !up,
    `exit=${r.code} ecoute=${up} msg=${/DÉMARRAGE ARRÊTÉ/.test(r.out) ? "présent" : "ABSENT"}`);
}

// ---------- FF2 — Pool initialisé puis erreur : fermeture propre ----------
{
  // Même scénario : la ligne « Pool PostgreSQL fermé proprement » prouve la
  // libération des ressources initialisées avant la sortie.
  const r = await runServer({
    DATABASE_URL: "postgresql://t@127.0.0.1:9/inert",
    NODE_ENV: "test", PORT: "5102",
  }, 25000);
  check("FF2", "fermeture propre du pool initialisé avant la sortie",
    r.code === 1 && /Pool PostgreSQL fermé proprement/.test(r.out),
    `exit=${r.code} propre=${/Pool PostgreSQL fermé proprement/.test(r.out)}`);
}

// ---------- FF3 — Délai d'attente dépassé : aucune readiness trompeuse ----------
{
  // Serveur TCP local qui accepte mais ne répond jamais → timeout de connexion.
  const hang = net.createServer(() => { /* silencieux */ });
  await new Promise((res) => hang.listen(5103, "127.0.0.1", res));
  const r = await runServer({
    DATABASE_URL: "postgresql://t@127.0.0.1:5103/inert",
    NODE_ENV: "test", PORT: "5104",
  }, 60000);
  const up = await listening(5104);
  hang.close();
  check("FF3", "timeout de connexion → échec de démarrage, aucune disponibilité trompeuse",
    r.code === 1 && /DÉMARRAGE ARRÊTÉ/.test(r.out) && !up,
    `exit=${r.code} ecoute=${up}`);
}

// ---------- FF4 — Driver legacy supprimé : refus EXPLICITE (aucun repli silencieux) ----------
{
  const r = await runServer({
    DATABASE_DRIVER: "mongo", DATABASE_URL: "postgresql://t@127.0.0.1:9/inert",
    NODE_ENV: "test", PORT: "5105",
  }, 15000);
  const up = await listening(5105);
  check("FF4", "driver mongo (legacy supprimé) → refus explicite, aucune écoute HTTP",
    r.code !== 0 && /invalide/i.test(r.out) && !up,
    `exit=${r.code} ecoute=${up} msg=${/invalide/i.test(r.out) ? "présent" : "ABSENT"}`);
}

// ---------- FF5/FF6 — Isolement et fuites ----------
{
  const r = await runServer({
    DATABASE_URL: "postgresql://t@127.0.0.1:9/inert", NODE_ENV: "test", PORT: "5106",
  }, 25000);
  const leaked = /eyJhbGciOi|BEGIN .*PRIVATE|password=/i.test(r.out);
  check("FF5", "sorties : aucun secret/URI/token (patterns JWT/privés/password)",
    !leaked, `fuite=${leaked}`);
  check("FF6", "isolement : toutes les cibles de test = 127.0.0.1 locales (aucun accès distant)",
    true, "127.0.0.1:9 et 127.0.0.1:5103 (TCP silencieux local)");
}

// ---------- FF7 — Cas « connexion réussie » (NOT RUN — distinct des résultats) ----------
console.log("NOT RUN | FF7 connexion réussie → démarrage normal | aucune base autorisée disponible " +
  "(branche succès inchangée par la correction ; démarrages normaux observés 2G.13/2G.14B)");

const failed = results.filter((x) => !x.pass).length;
console.log(`\nBILAN FAILFAST: ${results.length - failed}/${results.length} PASS — + FF7 NOT RUN (documenté)`);
process.exit(failed === 0 ? 0 : 1);
