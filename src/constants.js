/**
 * Constantes métier (miroir frontend de Backend/constants.js).
 * USAGE AFFICHAGE UNIQUEMENT : le backend reste la source de vérité
 * (plan actif, quota et permissions sont toujours vérifiés côté serveur).
 */

export const PLAN_NAMES = Object.freeze({
  FREE: "Free",
  BASIC: "Basic",
  PREMIUM: "Premium"
});

export const SUBSCRIPTION_STATUS = Object.freeze({
  ACTIVE: "active",
  EXPIRED: "expired",
  CANCELED: "canceled",
  PENDING: "pending"
});

export const USER_ROLES = Object.freeze({
  USER: "user",
  ADMIN: "admin"
});

/**
 * Compatibilité historique : les comptes créés avant la Phase 4A
 * avaient user_plan = "Gratuit" alors que le plan en base s'appelle "Free".
 */
export const isFreePlan = (planName) =>
  [PLAN_NAMES.FREE.toLowerCase(), "gratuit"].includes(String(planName || "").toLowerCase());

/** Niveau hiérarchique d'un plan (1 : Free, 2 : Basic, 3 : Premium). */
export const planLevel = (planName) => {
  const levels = {
    [PLAN_NAMES.FREE.toLowerCase()]: 1,
    gratuit: 1,
    [PLAN_NAMES.BASIC.toLowerCase()]: 2,
    [PLAN_NAMES.PREMIUM.toLowerCase()]: 3
  };
  return levels[String(planName || "").toLowerCase()] ?? 0;
};
