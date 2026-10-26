import { db } from "../db/index.js";
import { SUBSCRIPTION_STATUS, PLAN_NAMES } from "../constants.js";

/**
 * Droits EFFECTIFS d'un utilisateur — source de vérité pour /auth/me et le quota.
 *
 * Règles (inchangées depuis Mongoose — la logique métier n'est pas réinventée) :
 * - l'abonnement le plus récent (startDate desc) porte le plan ;
 * - endDate < maintenant => expiré, MÊME si le statut stocké dit encore "active"
 *   (l'expiration n'attend pas le cron, qui ne sert qu'aux e-mails/mises à jour de masse) ;
 * - sans abonnement actif => plan Free (quota Free) ;
 * - la détection d'expiration déclenche une synchro opportuniste du statut en base.
 */
export async function getEffectiveEntitlements(userId) {
  const user = await db.users.findByIdentifier(userId);
  if (!user) return null;

  // Compatibilité : les anciens comptes avaient user_plan = "Gratuit"
  const storedPlan = user.user_plan === "Gratuit" ? PLAN_NAMES.FREE : user.user_plan;
  let planName = storedPlan || PLAN_NAMES.FREE;
  let maxDownloads = user.user_max_downloads || 5;
  let status = null;
  let endDate = null;
  let subscriptionId = null;

  // findOne({userId}).sort({startDate:-1}).populate("planId") → JOIN SQL (mode postgres)
  const sub = await db.subscriptions.findLatestByUserPopulated(userId);
  let isActive = false;

  if (sub && sub.planId) {
    subscriptionId = sub._id;
    endDate = sub.endDate;
    const expiredByDate = sub.endDate && sub.endDate.getTime() < Date.now();

    if (sub.status === SUBSCRIPTION_STATUS.ACTIVE && expiredByDate) {
      status = SUBSCRIPTION_STATUS.EXPIRED;
      // Synchro opportuniste du statut stocké (le cron reste en secours) —
      // échec non bloquant mais JOURNALISÉ (Phase 5H : plus de catch muet).
      db.subscriptions.markExpiredById(sub._id).catch((e) =>
        console.warn("[DB] synchro expiration opportuniste échouée (non bloquant) :", e?.message)
      );
    } else {
      status = sub.status;
    }

    if (status === SUBSCRIPTION_STATUS.ACTIVE) {
      isActive = true;
      planName = sub.planId.name;
      maxDownloads = sub.planId.maxDownloads ?? maxDownloads;
    }
  }

  if (!isActive) {
    // Sans abonnement actif (nouveau compte, expiré ou annulé) : droits = plan Free.
    // La limite est lue dans le document plan (source de vérité), pas dans un défaut durci.
    planName = PLAN_NAMES.FREE;
    const freePlan = await db.plans.findByName(PLAN_NAMES.FREE);
    maxDownloads = freePlan?.maxDownloads ?? user.user_max_downloads ?? 5;
    status = status ?? null; // null = aucun abonnement en base
  }

  const downloadsUsed = user.downloadsUsed ?? 0;

  return {
    user,
    planName,
    maxDownloads,
    status,
    endDate,
    subscriptionId,
    downloadsUsed,
    remaining: Math.max(maxDownloads - downloadsUsed, 0)
  };
}
