import { pool } from "../pool.js";
import { toApiUser, keyFilter } from "../mappers.js";

/**
 * Repository users (PostgreSQL) — équivalents des accès Mongoose :
 * findOne({email}) / findById() / find() / save() / findByIdAndDelete() /
 * countDocuments() + opération atomique de quota (downloadRoutes).
 * Formes de retour = documents Mongoose (voir mappers.js).
 * Le hash de password n'est renvoyé qu'aux appels qui en ont besoin (login) ;
 * jamais dans les réponses publiques (les routes projettent les champs).
 */
export const usersRepo = {
  async findByEmail(email) {
    const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return toApiUser(rows[0], { withPassword: true });
  },

  /** Lookup dual : UUID PostgreSQL OU legacy ObjectId (JWT en transition). */
  async findByIdentifier(idOrLegacy) {
    const filter = keyFilter("id", idOrLegacy);
    const { rows } = await pool.query(`SELECT * FROM users WHERE ${filter.sql}`, filter.params);
    return toApiUser(rows[0], { withPassword: true });
  },

  /** find({}).select("-password").sort({createdAt:-1}).limit(n) */
  async list({ limit = 100 } = {}) {
    const { rows } = await pool.query(
      "SELECT * FROM users ORDER BY created_at DESC LIMIT $1",
      [limit]
    );
    return rows.map((row) => toApiUser(row, { withPassword: false }));
  },

  async create({ name, email, password, role = "user", user_plan = "Free", user_max_downloads = 5, downloads_used = 0, legacy_object_id = null }) {
    const { rows } = await pool.query(
      `INSERT INTO users (legacy_object_id, name, email, password, role, user_plan, user_max_downloads, downloads_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [legacy_object_id, name, email, password, role, user_plan, user_max_downloads, downloads_used]
    );
    return toApiUser(rows[0], { withPassword: true });
  },

  /**
   * findByIdAndDelete / user.deleteOne() — Lot 2C, correction A6.
   *
   * La suppression PHYSIQUE est refusée si l'utilisateur possède un historique
   * financier (payments / transactions) : ces écritures comptables ne doivent
   * jamais être supprimées en cascade pour contourner l'erreur FK `23503`
   * (mesurée au T13 : `payments.subscription_id` et `transactions.payment_id`
   * sont en NO ACTION alors que `users → subscriptions/payments` est en CASCADE).
   *
   * Contrat de retour : { ok: true } | { ok:false, reason: "not_found" }
   * | { ok:false, reason: "financial_history" }.
   *
   * Atomique : UN SEUL DELETE gardé par NOT EXISTS (paiements/transactions) —
   * aucun état partiel en cas de refus ; la classification post-hoc (not_found
   * vs financial_history) n'a qu'une valeur d'affichage, la sécurité (ne jamais
   * détruire l'historique financier) est portée par le DELETE lui-même.
   */
  async deleteById(idOrLegacy) {
    const filter = keyFilter("id", idOrLegacy);
    const { rows } = await pool.query(
      `DELETE FROM users
        WHERE ${filter.sql}
          AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.user_id = users.id)
          AND NOT EXISTS (SELECT 1 FROM transactions t
                          JOIN payments p2 ON p2.id = t.payment_id
                         WHERE p2.user_id = users.id)
        RETURNING id`,
      filter.params
    );
    if (rows.length > 0) return { ok: true };
    const { rows: still } = await pool.query(
      `SELECT 1 FROM users WHERE ${filter.sql}`,
      filter.params
    );
    return still.length === 0
      ? { ok: false, reason: "not_found" }
      : { ok: false, reason: "financial_history" };
  },

  async count() {
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM users");
    return rows[0].n;
  },

  /**
   * Équivalent atomique de :
   *   findOneAndUpdate({_id, downloadsUsed:{$lt:limit}}, {$inc:{downloadsUsed:1}}, {new:true})
   * Une SEULE opération SQL conditionnée — pas de read-then-write.
   * Retourne l'utilisateur mis à jour, ou null si quota atteint.
   */
  async incrementDownloadIfBelow(idOrLegacy, limit) {
    const filter = keyFilter("id", idOrLegacy, 2);
    const { rows } = await pool.query(
      `UPDATE users
          SET downloads_used = downloads_used + 1
        WHERE ${filter.sql}
          AND downloads_used < $1
        RETURNING *`,
      [limit, ...filter.params]
    );
    return toApiUser(rows[0]);
  },

  /** subscribe : $set {user_plan, user_max_downloads, downloadsUsed: 0}. */
  async updatePlanOnSubscribe(idOrLegacy, { user_plan, user_max_downloads }) {
    const filter = keyFilter("id", idOrLegacy, 3);
    const { rows } = await pool.query(
      `UPDATE users
          SET user_plan = $1, user_max_downloads = $2, downloads_used = 0
        WHERE ${filter.sql}
        RETURNING *`,
      [user_plan, user_max_downloads, ...filter.params]
    );
    return toApiUser(rows[0], { withPassword: true });
  }
};