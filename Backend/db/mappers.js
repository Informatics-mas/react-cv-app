/**
 * Mappers PostgreSQL → formes API actuelles (compatibilité `_id` — CRITIQUE).
 *
 * Le frontend et plusieurs routes backend consomment `_id`, `isPopular`,
 * `maxDownloads`, `downloadsUsed`, `user_plan`, `user_max_downloads`,
 * `transactionReference`, `rawGatewayResponse`, `startDate`/`endDate`, etc.
 * Ces mappers produisent exactement les mêmes propriétés (camelCase ou
 * snake_case selon l'usage actuel) que les documents Mongoose, y compris `__v`
 * (versionKey Mongoose) pour une sérialisation JSON identique.
 *
 * Les identifiants PostgreSQL (UUID) sont exposés sous `_id` — l'ancien
 * ObjectId MongoDB reste disponible dans `legacy_object_id` (jamais exposé
 * par l'API publique, usage migration/transition).
 */

/** users : forme document Mongoose (password inclus si withPassword). */
export function toApiUser(row, { withPassword = false } = {}) {
  if (!row) return null;
  const user = {
    _id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    user_plan: row.user_plan,
    user_max_downloads: row.user_max_downloads,
    downloadsUsed: row.downloads_used,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    __v: 0
  };
  if (withPassword) user.password = row.password;
  return user;
}

/** plans : forme document Mongoose (isPopular, maxDownloads). */
export function toApiPlan(row) {
  if (!row) return null;
  return {
    _id: row.id,
    name: row.name,
    price: Number(row.price),
    duree: row.duree,
    features: row.features ?? [],
    description: row.description,
    isPopular: row.is_popular,
    maxDownloads: row.max_downloads,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    __v: 0
  };
}

/**
 * subscriptions : forme document Mongoose.
 * - sans jointure : userId/planId = UUID (équivalent de l'ObjectId nu) ;
 * - avec colonnes jointes user_* (populate "userId" — name/email ou complet)
 *   et/ou plan_* (populate "planId") : sous-objets imbriqués comme Mongoose.
 */
export function toApiSubscription(row) {
  if (!row) return null;
  const sub = {
    _id: row.id,
    userId: row.user_name !== undefined
      ? { _id: row.user_id, name: row.user_name, email: row.user_email, ...(row.user_role !== undefined ? { role: row.user_role, user_plan: row.user_plan, user_max_downloads: row.user_max_downloads, downloadsUsed: row.user_downloads_used, createdAt: row.user_created_at, updatedAt: row.user_updated_at, __v: 0 } : {}) }
      : row.user_id,
    planId: row.plan_name !== undefined
      ? toApiPlan({
          id: row.plan_id,
          name: row.plan_name,
          price: row.plan_price,
          duree: row.plan_duree,
          features: row.plan_features,
          description: row.plan_description,
          is_popular: row.plan_is_popular,
          max_downloads: row.plan_max_downloads,
          created_at: row.plan_created_at,
          updated_at: row.plan_updated_at
        })
      : row.plan_id,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    autoRenew: row.auto_renew,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    __v: 0
  };
  return sub;
}

/** payments : forme document Mongoose (transactionReference, rawGatewayResponse). */
export function toApiPayment(row) {
  if (!row) return null;
  return {
    _id: row.id,
    userId: row.user_id,
    subscriptionId: row.subscription_id,
    amount: Number(row.amount),
    currency: row.currency,
    method: row.method,
    status: row.status,
    transactionReference: row.transaction_reference,
    paymentDate: row.payment_date,
    rawGatewayResponse: row.raw_gateway_response ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    __v: 0
  };
}

/** transactions : forme document Mongoose. */
export function toApiTransaction(row) {
  if (!row) return null;
  return {
    _id: row.id,
    paymentId: row.payment_id,
    type: row.type,
    amount: Number(row.amount),
    description: row.description ?? undefined,
    transactionDate: row.transaction_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    __v: 0
  };
}

// --- Identifiants : UUID PostgreSQL ou legacy ObjectId MongoDB (transition) ---
const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isObjectId(value) {
  return typeof value === "string" && OBJECT_ID_RE.test(value);
}

export function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Clause WHERE de lookup dual (UUID OU legacy ObjectId) — sans ambiguïté :
 * le format de la valeur détermine la colonne interrogée.
 * Retourne { sql, params } à concaténer avec d'autres conditions paramétrées.
 */
export function keyFilter(column, value, startIndex = 1) {
  if (isUuid(value)) {
    return { sql: `${column} = $${startIndex}`, params: [value] };
  }
  if (isObjectId(value)) {
    return { sql: `legacy_object_id = $${startIndex}`, params: [value] };
  }
  // Format inconnu (jamais un UUID ni un ObjectId) : ne peut matcher aucune ligne
  return { sql: "FALSE", params: [] };
}