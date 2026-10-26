/**
 * scripts/lib/safe-target.js — Lot 2G.4F
 * Garde-fous COMMUNS pour les scripts de test/maintenance PostgreSQL :
 *   - TLS strict explicite (jamais de désactivation de validation) ;
 *   - cible de test EXPLICITE (jamais une DATABASE_URL héritée en silence) ;
 *   - identité réelle vérifiée par CONNEXION (current_database) avant écriture ;
 *   - refus des bases persistantes/production connues et des cibles inconnues ;
 *   - échec explicite avant toute mutation.
 * Aucun secret n'est stocké ni affiché. Aucune dépendance applicative.
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../Backend/package.json"));
const pg = require("pg");

/** Bases connues comme persistantes ou système — JAMAIS cibles de test. */
export const FORBIDDEN_DB_NAMES = [
  "postgres", "neondb", "cvc_rehearsal", "template0", "template1", "maintenance",
];
/** Hôtes autorisés : branche de test Neon isolée + local. Tout autre hôte est refusé. */
export const ALLOWED_HOST_PATTERNS = [
  "ep-ancient-glitter-b98wmcx7", // branche de test br-quiet-base-b97uio6b
  "localhost", "127.0.0.1", "::1",
];
/** Confirmation non ambiguë requise pour les opérations destructives. */
export const PURGE_CONFIRM_TOKEN = "CONFIRME-PURGE-CVC-DISPOSABLE";

/** Refuse toute configuration de production. */
export function assertNotProduction(env = process.env) {
  const vals = [env.NODE_ENV, env.APP_ENV].map((x) => String(x || "").trim().toLowerCase());
  if (vals.some((v) => v === "production" || v === "prod")) {
    throw new Error("REFUS : configuration de production détectée (NODE_ENV/APP_ENV) — opération interdite.");
  }
}

/**
 * TLS strict : validation COMPLÈTE quand PGSSL=require ; mode local non-TLS
 * préservé (undefined) ; CA de test explicite possible via CVC_TLS_CA_FILE.
 * Aucun chemin ne désactive jamais la validation.
 */
export function strictSslOptions(env = process.env) {
  if (env.PGSSL !== "require") return undefined;
  const opts = { rejectUnauthorized: true };
  if (env.CVC_TLS_CA_FILE) opts.ca = fs.readFileSync(env.CVC_TLS_CA_FILE);
  return opts;
}

/**
 * Classification statique d'une cible (aucune connexion).
 * Retourne { host, db, errors } — errors non vide = cible refusée.
 */
export function classifyTarget(urlString) {
  const errors = [];
  let u;
  try { u = new URL(String(urlString || "")); }
  catch { return { host: "?", db: "?", errors: ["URL invalide ou absente"] }; }
  if (!/^postgres(ql)?:$/.test(u.protocol)) errors.push(`protocole non autorisé (${u.protocol})`);
  const host = u.hostname.toLowerCase();
  if (!ALLOWED_HOST_PATTERNS.some((p) => host === p || host.includes(p))) {
    errors.push(`hôte hors liste autorisée (${host})`);
  }
  const db = (u.pathname || "").replace(/^\//, "");
  if (!db) errors.push("base cible absente de l'URL");
  if (FORBIDDEN_DB_NAMES.includes(db)) errors.push(`base persistante/système interdite (${db})`);
  return { host, db, errors };
}

/**
 * Garde complète avant toute écriture :
 *  1) pas de configuration de production ;
 *  2) URL explicite (la variable doit être fournie volontairement) ;
 *  3) cible classifiée (hôte autorisé, base non interdite) ;
 *  4) identité RÉELLE confirmée par connexion : current_database() == base de l'URL
 *     (et == expectedDb si fourni) — jamais déduite d'une variable seule.
 * Mode "write" : refus explicite ; mode "read" : mêmes refus (lecture protégée aussi).
 * Échec = exception AVANT toute mutation.
 */
export async function assertTestTarget({ url, mode = "write", expectedDb = null, env = process.env } = {}) {
  assertNotProduction(env);
  if (!url) {
    throw new Error("REFUS : cible explicite requise (variable CVC_TEST_DB_URL absente) — " +
      "une variable DATABASE_URL héritée ne doit jamais sélectionner la cible en silence.");
  }
  const { host, db, errors } = classifyTarget(url);
  if (errors.length) throw new Error(`REFUS cible ${mode} : ${errors.join(" ; ")}`);
  if (expectedDb && db !== expectedDb) {
    throw new Error(`REFUS : base cible '${db}' ≠ base attendue '${expectedDb}' (contradiction de configuration).`);
  }
  const client = new pg.Client({
    connectionString: url,
    ssl: strictSslOptions(env),
    connectionTimeoutMillis: 30000,
  });
  let ident;
  try {
    await client.connect();
    const r = await client.query(
      "SELECT current_database() AS db, current_user AS usr, version() AS ver");
    ident = r.rows[0];
  } finally {
    await client.end().catch(() => {});
  }
  if (ident.db !== db) {
    throw new Error(`REFUS : identité serveur contradictoire (current_database='${ident.db}' ≠ URL '${db}').`);
  }
  if (FORBIDDEN_DB_NAMES.includes(ident.db)) {
    throw new Error(`REFUS : base persistante/système confirmée ('${ident.db}') — opération interdite.`);
  }
  return { host, db: ident.db, user: ident.usr, server: String(ident.ver).split(" ").slice(0, 2).join(" ") };
}
