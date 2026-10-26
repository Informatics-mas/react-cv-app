import { pool } from "../pool.js";
import { toApiTransaction, keyFilter } from "../mappers.js";

/**
 * Repository transactions (PostgreSQL) — équivalents Mongoose (modèle Transaction).
 * Actuellement inutilisé par les routes (préparation GeniusPay) ; fourni pour
 * la migration et le flux /subscribe transactionnel.
 * createWithin() s'exécute sur le client de la transaction en cours.
 */
export const transactionsRepo = {
  /** Insertion dans la transaction en cours (client dédié — étape 15). */
  async createWithin(client, {
    payment_id, type, amount, description = null, transaction_date,
    legacy_object_id = null
  }) {
    const { rows } = await client.query(
      `INSERT INTO transactions
         (legacy_object_id, payment_id, type, amount, description, transaction_date)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()))
       RETURNING *`,
      [legacy_object_id, payment_id, type, amount, description, transaction_date ?? null]
    );
    return toApiTransaction(rows[0]);
  },

  async create(data) {
    const { withTransaction } = await import("../pool.js");
    return withTransaction((client) => transactionsRepo.createWithin(client, data));
  },

  async findByIdentifier(idOrLegacy) {
    const filter = keyFilter("id", idOrLegacy);
    const { rows } = await pool.query(`SELECT * FROM transactions WHERE ${filter.sql}`, filter.params);
    return toApiTransaction(rows[0]);
  },

  /** find({paymentId}) — historique d'un paiement. */
  async listByPayment(paymentOrLegacy) {
    const filter = keyFilter("payment_id", paymentOrLegacy, 1);
    const { rows } = await pool.query(
      `SELECT * FROM transactions WHERE ${filter.sql} ORDER BY transaction_date ASC`,
      filter.params
    );
    return rows.map(toApiTransaction);
  },

  async count() {
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM transactions");
    return rows[0].n;
  }
};