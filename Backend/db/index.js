/**
 * Façade d'accès aux données — PostgreSQL (Neon) UNIQUEMENT.
 *
 *   DATABASE_DRIVER absent ou "postgres"  → db/repositories/* (pg, Neon)
 *   toute autre valeur (mongo, mysql…)     → REFUS EXPLICITE (aucun repli silencieux)
 *
 * Les formes de retour restent les documents API historiques (_id, camelCase…) :
 * les routes et l'API publique sont inchangées. MongoDB (legacy) a été SUPPRIMÉ
 * du runtime — voir MIGRATION_NEON-FINAL-SUPPRESSION-SUPABASE-MONGODB.md.
 */

const driver = (process.env.DATABASE_DRIVER || "postgres").toLowerCase();

if (driver !== "postgres") {
  console.error(`❌ DATABASE_DRIVER invalide : "${driver}" — seul "postgres" (Neon) est supporté.`);
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL absente — configuration PostgreSQL (Neon) requise.");
  process.exit(1);
}

const { usersRepo } = await import("./repositories/users.js");
const { plansRepo } = await import("./repositories/plans.js");
const { subsRepo } = await import("./repositories/subscriptions.js");
const { paymentsRepo } = await import("./repositories/payments.js");
const { transactionsRepo } = await import("./repositories/transactions.js");
const { sessionsRepo } = await import("./repositories/sessions.js");

const store = {
  users: usersRepo,
  plans: plansRepo,
  subscriptions: subsRepo,
  payments: paymentsRepo,
  transactions: transactionsRepo,
  sessions: sessionsRepo
};

export const DRIVER = "postgres";
export const db = store;
export default db;