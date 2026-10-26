import { pool } from "../pool.js";
import { toApiPayment, keyFilter } from "../mappers.js";

/**
 * Repository payments (PostgreSQL) — équivalents Mongoose (modèle Payment).
 * Actuellement inutilisé par les routes (préparation GeniusPay) ; fourni pour
 * la migration et le flux /subscribe transactionnel.
 * createWithin() s'exécute sur le client de la transaction en cours.
 */
export const paymentsRepo = {
  /** Insertion dans la transaction en cours (client dédié — étape 15). */
  async createWithin(client, {
    user_id, subscription_id, amount, currency = "XOF", method,
    status = "pending", transaction_reference, payment_date, raw_gateway_response = null,
    legacy_object_id = null
  }) {
    const { rows } = await client.query(
      `INSERT INTO payments
         (legacy_object_id, user_id, subscription_id, amount, currency, method,
          status, transaction_reference, payment_date, raw_gateway_response)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, now()), $10)
       RETURNING *`,
      [legacy_object_id, user_id, subscription_id, amount, currency, method,
       status, transaction_reference, payment_date ?? null, raw_gateway_response]
    );
    return toApiPayment(rows[0]);
  },

  async create(data) {
    return withTransactionlessCreate(data);
  },

  async findByIdentifier(idOrLegacy) {
    const filter = keyFilter("id", idOrLegacy);
    const { rows } = await pool.query(`SELECT * FROM payments WHERE ${filter.sql}`, filter.params);
    return toApiPayment(rows[0]);
  },

  /** findOne({transactionReference}) — anti double-paiement. */
  async findByReference(transactionReference) {
    const { rows } = await pool.query(
      "SELECT * FROM payments WHERE transaction_reference = $1",
      [transactionReference]
    );
    return toApiPayment(rows[0]);
  },

  async listByUser(userOrLegacy, { limit = 100 } = {}) {
    const filter = keyFilter("user_id", userOrLegacy, 2);
    const { rows } = await pool.query(
      `SELECT * FROM payments WHERE ${filter.sql} ORDER BY created_at DESC LIMIT $1`,
      [limit, ...filter.params]
    );
    return rows.map(toApiPayment);
  },

  async count() {
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM payments");
    return rows[0].n;
  },

  async sumAmountByStatus(status) {
    const { rows } = await pool.query(
      "SELECT COALESCE(sum(amount), 0)::numeric AS total FROM payments WHERE status = $1",
      [status]
    );
    return Number(rows[0].total);
  }
};

/** Hors-transaction : insertion simple (futur usage GeniusPay). */
async function withTransactionlessCreate(data) {
  const { withTransaction } = await import("../pool.js");
  return withTransaction((client) => paymentsRepo.createWithin(client, data));
}