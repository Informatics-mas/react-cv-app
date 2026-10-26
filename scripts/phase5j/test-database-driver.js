#!/usr/bin/env node
/**
 * Lot 2G.14A — Tests isolés de la sélection de DATABASE_DRIVER (sous-processus).
 *
 * SÛRETÉ : chaque cas tourne dans un processus ENFANT à environnement contrôlé
 * (PATH + variables explicitement passées) — aucun `.env` lu, jamais de variable
 * héritée implicite, cibles de connexion INERTES (127.0.0.1:9, jamais de réseau).
 * Le parent n'importe aucun module applicatif.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const INDEX_URL = new URL("../../Backend/db/index.js", import.meta.url).href;
const INERT_PG = "postgresql://test@127.0.0.1:9/inert"; // cible locale inerte

const results = [];
const check = (id, label, pass, evidence) => {
  results.push({ id, pass });
  console.log(`${pass ? "PASS" : "FAIL"} | ${id} ${label} | ${evidence}`);
};

/** Lance un enfant avec environnement minimal et retourne { code, out, err }. */
function runChild(env, code) {
  try {
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", code], {
      env: { PATH: process.env.PATH, ...env },
      encoding: "utf8", timeout: 20000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, out, err: "" };
  } catch (e) {
    return { code: e.status ?? -1, out: String(e.stdout || ""), err: String(e.stderr || "") };
  }
}

const probe = `const m = await import(${JSON.stringify(INDEX_URL)}); console.log("DRIVER=" + m.DRIVER);`;
const probeClean = `${probe} const { pool } = await import(${JSON.stringify(
  new URL("../../Backend/db/pool.js", import.meta.url).href)}); if (pool?.end) await pool.end();`;

// T1 — DATABASE_DRIVER absent + DATABASE_URL présent → PostgreSQL
{
  const r = runChild({ DATABASE_URL: INERT_PG }, probeClean);
  check("T1", "DATABASE_DRIVER absent → PostgreSQL sélectionné",
    r.code === 0 && /DRIVER=postgres/.test(r.out), `exit=${r.code} ${r.out.trim()}`);
}

// T2 — DATABASE_DRIVER=postgres → PostgreSQL
{
  const r = runChild({ DATABASE_DRIVER: "postgres", DATABASE_URL: INERT_PG }, probeClean);
  check("T2", "DATABASE_DRIVER=postgres → PostgreSQL sélectionné",
    r.code === 0 && /DRIVER=postgres/.test(r.out), `exit=${r.code} ${r.out.trim()}`);
}

// T3 — PostgreSQL sans configuration requise (DATABASE_URL absent) → échec explicite
{
  const r = runChild({ DATABASE_DRIVER: "postgres" }, probe);
  check("T3", "PostgreSQL sans DATABASE_URL → échec explicite et contrôlé",
    r.code !== 0 && /DATABASE_URL/.test(r.err), `exit=${r.code} msg=${r.err.split("\n")[0].slice(0, 60)}`);
}

// T4 — Driver inconnu → refus explicite
{
  const r = runChild({ DATABASE_DRIVER: "mysql", DATABASE_URL: INERT_PG }, probe);
  check("T4", "Driver inconnu → refus explicite (jamais de choix silencieux)",
    r.code !== 0 && /invalide/i.test(r.err), `exit=${r.code} msg=${r.err.split("\n")[0].slice(0, 60)}`);
}

// T5 — Driver MongoDB legacy → REFUS EXPLICITE (driver supprimé du runtime, aucun repli)
{
  const r = runChild({ DATABASE_DRIVER: "mongo", DATABASE_URL: INERT_PG }, probe);
  check("T5", "DATABASE_DRIVER=mongo (legacy supprimé) → refus explicite, aucun repli",
    r.code !== 0 && /invalide/i.test(r.err) && !/DRIVER=mongo/.test(r.out),
    `exit=${r.code} msg=${r.err.split("\n")[0].slice(0, 60)}`);
}

// T6 — Absence de driver ET de DATABASE_URL → erreur explicite postgres (pas de repli mongo)
{
  const r = runChild({}, probe);
  check("T6", "driver absent + DATABASE_URL absent → erreur explicite (aucun repli MongoDB)",
    r.code !== 0 && /DATABASE_URL/.test(r.err) && !/mongoose|MongoDB connect/i.test(r.err + r.out),
    `exit=${r.code} msg=${r.err.split("\n")[0].slice(0, 60)}`);
}

// T7 — Import du module DB : aucun effet de bord inattendu (aucune connexion à l'import,
//       exports attendus, fermeture propre du pool)
{
  const r = runChild({ DATABASE_DRIVER: "postgres", DATABASE_URL: INERT_PG },
    `${probeClean} const { db } = await import(${JSON.stringify(INDEX_URL)}); ` +
    `console.log("STORE=" + ["users","plans","subscriptions","payments","transactions","sessions"].every((k) => !!db[k]));`);
  check("T7", "import du module DB → sans effet de bord (store complet, sortie propre)",
    r.code === 0 && /DRIVER=postgres/.test(r.out) && /STORE=true/.test(r.out),
    `exit=${r.code} ${r.out.trim().replace(/\n/g, " ")}`);
}

// T8 — Erreur de connexion PostgreSQL → jamais de repli silencieux vers MongoDB
{
  const r = runChild({ DATABASE_DRIVER: "postgres", DATABASE_URL: INERT_PG },
    `const { pool } = await import(${JSON.stringify(
      new URL("../../Backend/db/pool.js", import.meta.url).href)}); ` +
    `try { await pool.query("SELECT 1"); console.log("CONNECTED?"); } ` +
    `catch (e) { console.log("ERRCLASS=" + (e.constructor?.name || "?") + " MONGO_FALLBACK=" + /mongoose|MongoDB/i.test(String(e.message))); } ` +
    `finally { await pool.end().catch(() => {}); }`);
  check("T8", "erreur de connexion PG → erreur contrôlée, aucun repli MongoDB",
    r.code === 0 && /ERRCLASS=/.test(r.out) && /MONGO_FALLBACK=false/.test(r.out),
    `${r.out.trim()}`);
}

// T9 — Configuration isolée : aucun accès distant (toutes les cibles du harnais = 127.0.0.1)
{
  check("T9", "harnais isolé : cibles inertes locales uniquement (aucun accès distant)",
    INERT_PG.includes("127.0.0.1:9"), `cible=${INERT_PG.replace(/:[^:@]*@/, ":***@")}`);
}

const failed = results.filter((x) => !x.pass).length;
console.log(`\nBILAN DATABASE-DRIVER: ${results.length - failed}/${results.length} PASS`);
process.exit(failed === 0 ? 0 : 1);
