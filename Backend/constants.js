/**
 * Constantes métier — source de vérité côté Backend.
 * Le frontend a un miroir dans src/constants.js (affichage uniquement).
 */

export const SUBSCRIPTION_STATUS = Object.freeze({
  ACTIVE: "active",
  EXPIRED: "expired",
  CANCELED: "canceled",
  // "pending" : préparation Phase 4B (intention de paiement non encore payée)
  PENDING: "pending"
});

export const PLAN_NAMES = Object.freeze({
  FREE: "Free",
  BASIC: "Basic",
  PREMIUM: "Premium"
});

export const USER_ROLES = Object.freeze({
  USER: "user",
  ADMIN: "admin",
  // Legacy : jamais attribué par l'application, conservé pour compatibilité des documents existants
  PREMIUM_LEGACY: "premium"
});
