import { pool } from "../pool.js";
import { toApiPlan, keyFilter } from "../mappers.js";

/**
 * Repository plans (PostgreSQL) — équivalents Mongoose :
 * find() / findOne({name}) / findById() / findByIdAndUpdate() / save() /
 * findByIdAndDelete(). Formes de retour = documents Mongoose.
 */
export const plansRepo = {
  /** find().sort({price:1}).limit(20) */
  async list() {
    const { rows } = await pool.query("SELECT * FROM plans ORDER BY price ASC LIMIT 20");
    return rows.map(toApiPlan);
  },

  async findByName(name) {
    const { rows } = await pool.query("SELECT * FROM plans WHERE name = $1", [name]);
    return toApiPlan(rows[0]);
  },

  /** findByIdentifier : UUID OU legacy ObjectId (transition). */
  async findByIdentifier(idOrLegacy) {
    const filter = keyFilter("id", idOrLegacy);
    const { rows } = await pool.query(`SELECT * FROM plans WHERE ${filter.sql}`, filter.params);
    return toApiPlan(rows[0]);
  },

  async create({ name, price, duree, features = [], description, isPopular = false, maxDownloads, legacy_object_id = null }) {
    const { rows } = await pool.query(
      `INSERT INTO plans (legacy_object_id, name, price, duree, features, description, is_popular, max_downloads)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [legacy_object_id, name, price, duree, features, description, isPopular, maxDownloads]
    );
    return toApiPlan(rows[0]);
  },

  /** findByIdAndUpdate(id, {$set}, {new:true}) */
  async update(idOrLegacy, { name, price, duree, features, description, isPopular, maxDownloads }) {
    const filter = keyFilter("id", idOrLegacy, 8); // $1..$7 = colonnes, le filtre commence à $8
    const { rows } = await pool.query(
      `UPDATE plans
          SET name = $1, price = $2, duree = $3, features = $4,
              description = $5, is_popular = $6, max_downloads = $7
        WHERE ${filter.sql}
        RETURNING *`,
      [name, price, duree, features, description, isPopular, maxDownloads, ...filter.params]
    );
    if (!rows[0]) return null; // id inexistant : la route renverra un 404 propre
    return toApiPlan(rows[0]);
  },

  /** findByIdAndDelete — Lot 2G.1 : refus atomique si abonnements dépendants. */
  async deleteById(idOrLegacy) {
    const filter = keyFilter("id", idOrLegacy);
    // Garde atomique : jamais de suppression d'un plan encore référencé,
    // jamais de cascade sur les abonnements (préservation de l'historique).
    const { rows } = await pool.query(
      `DELETE FROM plans
        WHERE ${filter.sql}
          AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.plan_id = plans.id)
        RETURNING *`,
      filter.params
    );
    if (rows.length > 0) return { ok: true, plan: toApiPlan(rows[0]) };
    const { rows: still } = await pool.query(
      `SELECT 1 FROM plans WHERE ${filter.sql}`,
      filter.params
    );
    return still.length === 0
      ? { ok: false, reason: "not_found" }
      : { ok: false, reason: "has_subscriptions" };
  }
};