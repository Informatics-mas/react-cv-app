import { pool, withTransaction } from "../pool.js";
import { toApiSubscription, keyFilter } from "../mappers.js";

/**
 * Repository subscriptions (PostgreSQL) — équivalents Mongoose :
 * find({}).populate×2 / findOne({userId}).sort({startDate:-1}).populate("planId") /
 * updateMany({userId,status:active}) / updateOne / countDocuments / save.
 * Les populate() Mongo sont remplacés par des JOIN SQL — la forme JSON
 * imbriquée (userId:{name,email}, planId:{name,price}) est identique.
 */
export const subsRepo = {
  /** find({}).populate("userId","name email").populate("planId","name price").sort({createdAt:-1}).limit(n) */
  async listPopulated({ limit = 100 } = {}) {
    const { rows } = await pool.query(
      `SELECT s.*,
              u.name AS user_name, u.email AS user_email,
              p.name AS plan_name, p.price AS plan_price
         FROM subscriptions s
         JOIN users u  ON u.id = s.user_id
         JOIN plans p  ON p.id = s.plan_id
        ORDER BY s.created_at DESC
        LIMIT $1`,
      [limit]
    );
    return rows.map(toApiSubscription);
  },

  async findByIdentifier(idOrLegacy) {
    const filter = keyFilter("id", idOrLegacy);
    const { rows } = await pool.query(`SELECT * FROM subscriptions WHERE ${filter.sql}`, filter.params);
    return toApiSubscription(rows[0]);
  },

  /** findOne({userId}).sort({startDate:-1}).populate("planId") — entitlements. */
  async findLatestByUserPopulated(userIdOrLegacy) {
    const filter = keyFilter("s.user_id", userIdOrLegacy, 1);
    const { rows } = await pool.query(
      `SELECT s.*,
              p.id AS plan_id, p.name AS plan_name, p.price AS plan_price,
              p.duree AS plan_duree, p.features AS plan_features,
              p.description AS plan_description, p.is_popular AS plan_is_popular,
              p.max_downloads AS plan_max_downloads,
              p.created_at AS plan_created_at, p.updated_at AS plan_updated_at
         FROM subscriptions s
         LEFT JOIN plans p ON p.id = s.plan_id
        WHERE ${filter.sql}
        ORDER BY s.start_date DESC
        LIMIT 1`,
      filter.params
    );
    return toApiSubscription(rows[0]);
  },

  /** findById + save() (PUT admin : status, endDate, autoRenew partiels). */
  async updateFields(idOrLegacy, { status, endDate, autoRenew }) {
    const filter = keyFilter("id", idOrLegacy, 4);
    const { rows } = await pool.query(
      `UPDATE subscriptions
          SET status     = COALESCE($1, status),
              end_date   = COALESCE($2, end_date),
              auto_renew = COALESCE($3, auto_renew)
        WHERE ${filter.sql}
        RETURNING *`,
      [status ?? null, endDate ?? null, autoRenew ?? null, ...filter.params]
    );
    return toApiSubscription(rows[0]);
  },

  /** updateMany({userId, status:"active"}, {$set:{status:"expired"}}) */
  async expireActiveByUser(userIdOrLegacy) {
    const filter = keyFilter("user_id", userIdOrLegacy, 1);
    const { rowCount } = await pool.query(
      `UPDATE subscriptions SET status = 'expired' WHERE ${filter.sql} AND status = 'active'`,
      filter.params
    );
    return rowCount;
  },

  /** updateOne({_id}, {$set:{status:"expired"}}) — synchro opportuniste entitlements. */
  async markExpiredById(idOrLegacy) {
    const filter = keyFilter("id", idOrLegacy);
    await pool.query(
      `UPDATE subscriptions SET status = 'expired' WHERE ${filter.sql} AND status = 'active'`,
      filter.params
    );
  },

  async countByStatus(status) {
    const { rows } = await pool.query(
      "SELECT count(*)::int AS n FROM subscriptions WHERE status = $1",
      [status]
    );
    return rows[0].n;
  },

  /** Cron J-7 : find({endDate:{$gte,$lte},status:active}).populate("userId").populate("planId"). */
  async findExpiringPopulated(start, end) {
    const { rows } = await pool.query(
      `SELECT s.*,
              u.name AS user_name, u.email AS user_email,
              p.name AS plan_name, p.price AS plan_price
         FROM subscriptions s
         JOIN users u ON u.id = s.user_id
         JOIN plans p ON p.id = s.plan_id
        WHERE s.end_date >= $1 AND s.end_date <= $2 AND s.status = 'active'`,
      [start, end]
    );
    return rows.map(toApiSubscription);
  },

  /**
   * Souscription transactionnelle (Phase 5B, étape 15) — un SEUL client pg :
   * BEGIN → expire anciens actifs → INSERT subscription → UPDATE user →
   * COMMIT ; ROLLBACK sur la moindre erreur. PARCOURS GRATUIT UNIQUEMENT.
   *
   * SÉCURITÉ (Lot 1bis — risque R1) : les plans PAYANTS sont REFUSÉS ici.
   * Un paiement ne peut être marqué 'succeeded' que par le traitement serveur
   * autorisé (paymentService.processPaymentOutcome — verrou FOR UPDATE +
   * idempotence) : jamais depuis une valeur de plan, une méthode ou des
   * détails fournis par le client. Le parcours payant passe par
   * initiatePaidSubscription (intention 'pending', ZÉRO droit) puis
   * confirmation idempotente.
   *
   * CONVENTION DES RÉFÉRENCES DE PAIEMENT :
   * - `MOCK-<UUID>` : tentative SIMULÉE (mode test) — raw_gateway_response
   *   porte `mock: true` + notice MODE TEST. Jamais une preuve de paiement.
   * - `SUB-<id>` : ancien préfixe du parcours direct legacy — SUPPRIMÉ
   *   (Lot 1bis) ; ne plus en créer. Toute ligne activée doit provenir de
   *   processPaymentOutcome.
   * - `SUB-` éventuellement présent en base = historique — à ne jamais
   *   confondre avec une confirmation prestataire.
   */
  async subscribe({ user, plan, startDate, endDate, paymentMethod, details }) {
    if (Number(plan.price) > 0) {
      const err = new Error(
        "Souscription payante refusée : les plans payants passent par " +
        "initiatePaidSubscription puis la confirmation de paiement côté serveur."
      );
      err.code = "PAYMENT_PROVIDER_REQUIRED";
      throw err;
    }
    return withTransaction(async (client) => {
      // Phase 5I (contournement de quota) : l'état PRÉCÉDENT est lu AVANT toute
      // écriture. Le compteur de téléchargements n'est réinitialisé que pour une
      // VRAIE nouvelle période : changement de plan, ou renouvellement après
      // expiration. La re-souscription au même plan encore actif conserve le
      // compteur — sinon /subscribe répétés permettent de recharger le quota
      // indéfiniment (vulnérabilité confirmée, test Q3).
      const { rows: [prev] } = await client.query(
        `SELECT status, end_date FROM subscriptions
          WHERE user_id = $1 ORDER BY start_date DESC LIMIT 1`,
        [user._id]
      );
      const samePlan = user.user_plan === plan.name;
      const isRenewal = Boolean(prev) && (prev.status !== "active" || new Date(prev.end_date) < startDate);
      const resetDownloads = !samePlan || isRenewal;

      // 1. Les anciens abonnements actifs passent à "expired" (comportement actuel)
      await client.query(
        `UPDATE subscriptions SET status = 'expired' WHERE user_id = $1 AND status = 'active'`,
        [user._id]
      );

      // 2. Nouvel abonnement
      const { rows: subRows } = await client.query(
        `INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, status, auto_renew)
         VALUES ($1, $2, $3, $4, 'active', false)
         RETURNING *`,
        [user._id, plan._id, startDate, endDate]
      );

      // 3. Profil : plan dénormalisé + quota (réinitialisé SEULEMENT pour une
      //    nouvelle période — voir resetDownloads plus haut, Phase 5I).
      await client.query(
        resetDownloads
          ? `UPDATE users SET user_plan = $1, user_max_downloads = $2, downloads_used = 0 WHERE id = $3`
          : `UPDATE users SET user_plan = $1, user_max_downloads = $2 WHERE id = $3`,
        [plan.name, plan.maxDownloads ?? 5, user._id]
      );

      // 4. Lot 1bis (risque R1) : l'ancien bloc payment `SUB-<id>` marqué
      //    'succeeded' sans prestataire a été SUPPRIMÉ — un paiement ne peut
      //    être confirmé que via paymentService.processPaymentOutcome.
      //    Convention des références : voir la doc de subscribe().

      return toApiSubscription(subRows[0]);
    });
  }
};

/**
 * Résolution de la méthode de paiement vers l'enum Payment.method.
 * Frontend actuel : 'card' | 'mobile' (provider: orange|mtn|wave) | 'free'.
 * Exportée (Lot 2G) : réutilisée par paymentService — mapping unique.
 */
export function resolvePaymentMethod(paymentMethod, details) {
  const direct = {
    card: "card",
    paypal: "paypal",
    orange_money: "orange_money",
    moov_money: "moov_money",
    mtn_money: "mtn_money",
    wave: "wave"
  };
  if (direct[paymentMethod]) return direct[paymentMethod];
  const providerMap = { orange: "orange_money", mtn: "mtn_money", wave: "wave", moov: "moov_money" };
  const provider = details?.provider;
  if (paymentMethod === "mobile" && providerMap[provider]) return providerMap[provider];
  return null;
}