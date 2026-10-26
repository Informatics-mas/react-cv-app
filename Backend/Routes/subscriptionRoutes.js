import express from "express";
import { db } from "../db/index.js";
import { isObjectId, isUuid } from "../db/mappers.js";
import { sendPlanConfirmationEmail } from '../utils/emailService.js'; 
import { protect, adminOnly } from "../Middleware/AuthMiddleware.js";
import { z } from "zod"
import { SUBSCRIPTION_STATUS } from "../constants.js";
import { isMockActive, initiatePaidSubscription } from "../services/paymentService.js";

const router = express.Router();

const subscribeSchema = z.object({
  // ObjectId (24) OU UUID PostgreSQL (36) — période de transition
  planId: z.string().refine((v) => isObjectId(v) || isUuid(v), {
    message: "L'ID du plan doit être un identifiant valide"
  }),
  paymentMethod: z.string().optional(),
  details: z.any().optional()
});

// Schéma de mise à jour d'un abonnement (PUT /:id).
// Champs alignés sur le modèle Mongoose Subscription et sur l'UI admin (subscriptions.jsx) :
// uniquement status (enum du modèle), endDate (date de fin) et autoRenew sont modifiables.
const updateSubSchema = z.object({
  status: z.enum(Object.values(SUBSCRIPTION_STATUS)).optional(),
  endDate: z.coerce.date().optional(),
  autoRenew: z.boolean().optional()
}).strict();

router.get("/", protect, adminOnly, async (req, res) => {
  try {
    // Phase 5I : pagination bornée [1..500] (idem userRoutes).
    const parsed = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 500) : 100;

    // populate("userId","name email") + populate("planId","name price") Mongo
    // remplacés par des JOIN SQL (mode postgres) — forme JSON identique.
    const subscriptions = await db.subscriptions.listPopulated({ limit });
      
    res.json(subscriptions);
  } catch {
    res.status(500).json({ message: "Erreur lors de la récupération des abonnements" });
  }
});

router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const validation = updateSubSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ message: "Données invalides" });
    const { status, endDate, autoRenew } = req.body;

    const updatedSub = await db.subscriptions.updateFields(req.params.id, { status, endDate, autoRenew });
    if (updatedSub) {
      res.json(updatedSub);
    } else {
      res.status(404).json({ message: "Abonnement non trouvé" });
    }
  } catch {
    res.status(500).json({ message: "Erreur lors de la mise à jour" });
  }
});

/**
 * POST /api/subscriptions/subscribe — souscription à un plan.
 *
 * ⚠️ PHASE 4A (préparation paiement) : ce endpoint active encore DIRECTEMENT le plan
 * sans vérification d'un paiement réel (système fictif assumé pour ne pas casser le
 * parcours avant l'intégration PSP en Phase 4B). À ce moment-là :
 *   - une intention de paiement / transaction "pending" sera créée ici,
 *   - l'activation (status ACTIVE + reset quota) ne se fera qu'après confirmation PSP.
 * Le modèle Payment existe déjà (Models/payements.js) et reste inutilisé en attendant.
 */
router.post("/subscribe", protect, async (req, res) => {
  try {
    const validation = subscribeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: "Données invalides", errors: validation.error.issues.map(issue => issue.message) });
    }
    const { planId, paymentMethod, details } = validation.data;

    const userIdStr = req.user.id || req.user._id; 

    if (!userIdStr) {
      return res.status(400).json({ message: "Identifiant de l'utilisateur manquant ou invalide." });
    }

    const user = await db.users.findByIdentifier(userIdStr);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const planDef = await db.plans.findByIdentifier(planId);
    if (!planDef) {
      return res.status(404).json({ message: "Plan introuvable." });
    }

    // Phase 5J-B : sans prestataire de paiement opérationnel (GeniusPay non
    // intégré), aucune souscription PAYANTE n'est activée — une redirection
    // navigateur ne constitue pas une preuve de paiement. Aucune écriture
    // n'est effectuée : ni abonnement, ni paiement fictif, ni quota touché.
    // Le parcours gratuit (price = 0) reste inchangé ; les abonnements
    // historiques ne sont ni supprimés ni rétrogradés.
    if (Number(planDef.price) > 0) {
      // Lot 2G : parcours de TEST possible si le mock de paiement est
      // légalement actif (jamais en production — validation fail-closed).
      // Création d'une intention « pending » sans AUCUN droit ; l'activation
      // n'a lieu qu'après confirmation idempotente (paymentService).
      if (isMockActive()) {
        const initiated = await initiatePaidSubscription({
          user, plan: planDef, paymentMethod, details,
        });
        return res.status(202).json({
          success: true,
          code: "PAYMENT_MOCK_PENDING",
          mock: true,
          notice: "MODE TEST — AUCUN PAIEMENT RÉEL N'A ÉTÉ EFFECTUÉ",
          reference: initiated.reference,
          intent: initiated.intent,
        });
      }
      return res.status(503).json({
        success: false,
        code: "PAYMENT_PROVIDER_UNAVAILABLE",
        message: "Le paiement est temporairement indisponible : les plans payants ne peuvent pas être activés pour le moment. Le plan gratuit reste disponible."
      });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + planDef.duree);

    // Écritures déléguées au store (mode dual) :
    // - postgres : transaction SQL (expire actifs → subscription → payment/transaction
    //   pour plans payants → mise à jour profil → COMMIT/ROLLBACK) ;
    // - mongo : flux historique inchangé (non transactionnel).
    const newSubscription = await db.subscriptions.subscribe({
      user,
      plan: planDef,
      startDate,
      endDate,
      paymentMethod,
      details
    });

    console.log(`✅ Plan [${planDef.name}] appliqué avec succès au profil de l'user: ${userIdStr}`);

    const emailPlanDetails = {
      name: planDef.name,
      maxDownloads: planDef.maxDownloads || 5,
      duree: planDef.duree,
      price: planDef.price
    };

    sendPlanConfirmationEmail(user.email, user.name, emailPlanDetails)
      .then(() => console.log(`✉️ Email de confirmation de plan envoyé à ${user.email}`))
      .catch((err) => console.error("❌ Échec de l'envoi de l'email de confirmation de plan :", err));

    res.status(201).json({
      success: true,
      message: `Abonnement au plan ${planDef.name} activé avec succès et e-mail envoyé.`,
      subscription: newSubscription
    });

  } catch (error) {
    console.error("❌ Erreur critique backend souscription :", error);
    res.status(500).json({ message: "Erreur serveur lors de la souscription." });
  }
});

export default router;