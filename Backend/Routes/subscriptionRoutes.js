import express from "express";
import Subscription from "../Models/subscriptions.js";
import Plans from "../Models/plans.js"; 
import User from "../Models/user.js"; 
import { sendPlanConfirmationEmail } from '../utils/emailService.js'; 
import { protect, adminOnly } from "../Middleware/AuthMiddleware.js";
import { z } from "zod"
import { SUBSCRIPTION_STATUS } from "../constants.js";

const router = express.Router();

const subscribeSchema = z.object({
  planId: z.string().length(24, "L'ID du plan doit être un ObjectId valide"),
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
    const limit = parseInt(req.query.limit) || 100;

    const subscriptions = await Subscription.find({})
      .populate("userId", "name email") 
      .populate("planId", "name price") 
      .sort({ createdAt: -1 })
      .limit(limit); // Application de la limite
      
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
    const subscription = await Subscription.findById(req.params.id);

    if (subscription) {
      subscription.status = status || subscription.status;
      subscription.endDate = endDate || subscription.endDate;
      subscription.autoRenew = autoRenew !== undefined ? autoRenew : subscription.autoRenew;

      const updatedSub = await subscription.save();
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
    const { planId } = validation.data;
    
    const userIdStr = req.user.id || req.user._id; 

    if (!userIdStr) {
      return res.status(400).json({ message: "Identifiant de l'utilisateur manquant ou invalide." });
    }

    const mongoose = await import("mongoose");
    const userId = new mongoose.Types.ObjectId(userIdStr);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const planDef = await Plans.findById(planId);
    if (!planDef) {
      return res.status(404).json({ message: "Plan introuvable." });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + planDef.duree);

    try {
      await Subscription.updateMany(
        { userId: userId, status: SUBSCRIPTION_STATUS.ACTIVE },
        { $set: { status: SUBSCRIPTION_STATUS.EXPIRED } }
      );
    } catch (updateError) {
      console.warn("⚠️ Attention : Impossible de mettre à jour les anciens plans :", updateError.message);
    }

    const newSubscription = new Subscription({
      userId,
      planId,
      startDate,
      endDate,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      autoRenew: false
    });
    await newSubscription.save();

   await User.findByIdAndUpdate(userId, {
      $set: {
        user_plan: planDef.name, 
        user_max_downloads: planDef.maxDownloads ?? 5,
        downloadsUsed: 0 // chaque activation de plan redonne le quota complet du plan
      }
    });

    console.log(`✅ Plan [${planDef.name}] appliqué avec succès au profil de l'user: ${userId}`);

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