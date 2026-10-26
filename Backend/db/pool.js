import pg from "pg";

/**
 * Pool PostgreSQL (Phase 5B) — utilisé uniquement côté backend Express.
 * Le frontend n'accède jamais à la base ; DATABASE_URL ne quitte pas le serveur.
 *
 * - DATABASE_URL requis quand DATABASE_DRIVER=postgres (sinon refus de démarrage) ;
 * - erreurs de connexion remontées proprement (pas de crash silencieux) ;
 * - pool.query() pour les requêtes simples, pool.connect() pour les transactions ;
 * - withTransaction() garantit BEGIN/COMMIT/ROLLBACK + release() sur un SEUL client.
 */

const driver = (process.env.DATABASE_DRIVER || "postgres").toLowerCase();

if (driver === "postgres" && !process.env.DATABASE_URL) {
  console.error(
    "❌ DATABASE_DRIVER=postgres (par défaut) mais DATABASE_URL est absent. " +
      "Renseignez DATABASE_URL (backend uniquement). " +
      "Base attendue : PostgreSQL (Neon) — tout autre driver est refusé."
  );
  process.exit(1);
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Phase 5H — plafond EXAMINÉ : les poolers (Neon / anciennement Supavisor) limitent
  // à 15 clients simultanés par pool (erreur EMAXCONNSESSION mesurée). max=8
  // laisse une marge pour un outil ponctuel (migration/admin) en parallèle.
  max: 8,
  // Phase 5H — résilience mesurée (Étape F) :
  // - création de connexion TLS vers base distante : 7-19 s mesurés dans cet
  //   environnement → connectionTimeoutMillis à 10 s faisait échouer TOUTE
  //   connexion à froid ("Connection terminated due to connection timeout") ;
  //   30 s couvre le pire mesuré (19,2 s) avec marge. Les requêtes chaudes
  //   restent à ~400 ms (la valeur n'est qu'un plafond, pas une latence).
  connectionTimeoutMillis: 30_000,
  // Diagnostic connexions interrompues (reproduction 02:17, ~7-8 min
  // d'inactivité) : les connexions CHAUDES entretenues (ex-min: 2) étaient
  // coupées par le pooler Neon ("Connection terminated unexpectedly" sur les
  // clients idle → logs "client actif"/"pool"). min: 0 = AUCUNE connexion
  // inerte maintenue : créées à la demande, libérées après idleTimeoutMillis
  // (30 s) — le pooler n'a plus de socket inactif à couper. Coût : création
  // TLS (7-19 s mesurée) au premier appel après inactivité, couverte par
  // connectionTimeoutMillis (30 s). TLS strict et keep-alive inchangés.
  min: 0,
  // Empêche la mort des sockets inactifs (coupures "Connection terminated
  // unexpectedly" observées côté pooler/NAT) par keep-alive TCP.
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  idleTimeoutMillis: 30_000,
  // Requêtes uniquement paramétrées côté repositories ($1, $2, ...) —
  // aucune concaténation de données utilisateur (voir étape sécurité).
  // TLS strict (Lot 2F — décision D2) : validation complète de la chaîne de
  // confiance. Jamais de contournement d'erreur de certificat. Nécessite un
  // magasin CA à jour (bundle système — testé OK : CA système, TLS 1.3).
  ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: true } : undefined
});

pool.on("error", (err) => {
  // Erreur client idle : signalée sans tuer le serveur (le pool recycle le client).
  // Journalisation sans secret : message + code PostgreSQL uniquement.
  console.error("⚠️ [DB] Erreur client PostgreSQL (pool) :", err.code || "", err.message);
});

// Phase 5H — (Étape B/F T5) : pg-pool RETIRE son listener d'erreur quand un
// client est ACQUIS (pg-pool/index.js, _acquireClient). Sans abonné, la mort du
// socket pendant une requête ou une transaction émet 'error' sans listener →
// exception non gérée = CRASH du processus Node (reproduit : "Connection
// terminated unexpectedly"). Ce handler, attaché à la CRÉATION de chaque client,
// absorbe l'événement dans tous les états : la requête en cours est rejetée
// normalement (ROLLBACK + 5xx), et le client mort est retiré du pool au release()
// (pg-pool : !client._queryable → _remove). Aucun secret loggé (code + message).
pool.on("connect", (client) => {
  client.on("error", (err) => {
    console.error("⚠️ [DB] Connexion PostgreSQL interrompue (client actif) :", err.code || "", err.message);
  });
});

/** Vérifie que la base répond (utile au démarrage du serveur). */
export async function ping() {
  const { rows } = await pool.query("SELECT 1 AS ok");
  return rows[0]?.ok === 1;
}

/**
 * Exécute `fn(client)` dans une transaction : BEGIN → fn → COMMIT,
 * ROLLBACK sur la moindre erreur, release() systématique.
 * Ne jamais utiliser plusieurs connexions pour une même transaction.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // le ROLLBACK échoue si la connexion est déjà tombée — l'erreur d'origine prime
    }
    throw error;
  } finally {
    client.release();
  }
}

export default pool;