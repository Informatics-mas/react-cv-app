import { pool } from "../pool.js";

/**
 * Registre de sessions JWT (Lot 2G.7) — PostgreSQL.
 * Chaque JWT porte un claim `jti` ; la session est ACTIVE si la ligne existe,
 * `revoked_at IS NULL` et `expires_at > now()`. Toute erreur de stockage est
 * remontée à l'appelant (le middleware d'auth refuse alors — jamais d'acceptation
 * silencieuse).
 */
export const sessionsRepo = {
  async create({ jti, userId, expiresAt }) {
    const { rows } = await pool.query(
      `INSERT INTO user_sessions (jti, user_id, expires_at)
       VALUES ($1, $2, $3) RETURNING jti, created_at, expires_at`,
      [jti, userId, expiresAt]
    );
    return rows[0];
  },

  /** Session active uniquement (non révoquée, non expirée) — sinon null. */
  async findActive(jti) {
    const { rows } = await pool.query(
      `SELECT jti, user_id, created_at, expires_at FROM user_sessions
       WHERE jti = $1 AND revoked_at IS NULL AND expires_at > now()`,
      [jti]
    );
    return rows[0] || null;
  },

  /** Révocation (idempotente) : retourne true si une session active a été révoquée. */
  async revoke(jti) {
    const { rows } = await pool.query(
      `UPDATE user_sessions SET revoked_at = now()
       WHERE jti = $1 AND revoked_at IS NULL RETURNING jti`,
      [jti]
    );
    return rows.length > 0;
  },

  /** Rétention : purge des sessions expirées depuis plus de 7 jours. */
  async purgeExpired() {
    const { rowCount } = await pool.query(
      `DELETE FROM user_sessions WHERE expires_at < now() - interval '7 days'`
    );
    return rowCount;
  },
};

export default sessionsRepo;
