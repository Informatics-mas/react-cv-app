import express from "express";
import Subscription from "../Models/subscriptions.js";
import Plans from "../Models/plans.js"; 
import User from "../Models/user.js"; // 👈 1. IMPORT OBLIGATOIRE DU MODÈLE USER
import { protect } from "../Middleware/AuthMiddleware.js";

const router = express.Router();

// @desc    Récupérer tous les abonnements (avec détails User et Plan)
// @route   GET /api/subscriptions
router.get("/", protect, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({})
      .populate("userId", "name email") 
      .populate("planId", "name price") 
      .sort({ createdAt: -1 });
    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des abonnements" });
  }
});

// @desc    Mettre à jour un abonnement (Statut, Date de fin, etc.)
// @route   PUT /api/subscriptions/:id
router.put("/:id", protect, async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la mise à jour" });
  }
});

// @desc    Créer ou basculer sur un nouvel abonnement (Gratuit ou Payant)
// @route   POST /api/subscriptions/subscribe
router.post("/subscribe", protect, async (req, res) => {
  try {
    const { planId, paymentMethod, details } = req.body;
    
    // Récupération sécurisée de l'ID utilisateur injecté par le middleware protect
    const userIdStr = req.user.id || req.user._id; 

    if (!userIdStr) {
      return res.status(400).json({ message: "Identifiant de l'utilisateur manquant ou invalide." });
    }

    const mongoose = await import("mongoose");
    const userId = new mongoose.Types.ObjectId(userIdStr);

    // 2. Récupérer les détails du plan pour calculer la date de fin
    const planDef = await Plans.findById(planId);
    if (!planDef) {
      return res.status(404).json({ message: "Plan introuvable." });
    }

    // 3. Calculer la date de fin (Date d'aujourd'hui + durée du plan en jours)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + planDef.duree);

    // 4. Mettre à jour les anciennes souscriptions de l'utilisateur (si elles existent)
    try {
      await Subscription.updateMany(
        { userId: userId, status: 'active' },
        { $set: { status: 'expired' } }
      );
    } catch (updateError) {
      console.warn("⚠️ Attention : Impossible de mettre à jour les anciens plans :", updateError.message);
    }

    // 5. Créer la nouvelle souscription active dans la collection Subscriptions
    const newSubscription = new Subscription({
      userId,
      planId,
      startDate,
      endDate,
      status: 'active',
      autoRenew: false
    });
    await newSubscription.save();

    // 🔥 6. DEUXIÈME CORRECTION CRUCIALE : METTRE À JOUR L'UTILISATEUR DANS LA COLLECTION USERS 🔥
    // On synchronise directement son profil en base de données pour que le login et le /me renvoient les bonnes infos !
    await User.findByIdAndUpdate(userId, {
      $set: {
        role: planDef.name.toLowerCase() === "premium" ? "premium" : "user",
        user_plan: planDef.name, 
        user_max_downloads: planDef.maxDownloads || 50 // Donne les droits associés au plan
      }
    });

    console.log(`✅ Plan [${planDef.name}] appliqué avec succès au profil de l'user: ${userId}`);

    res.status(201).json({
      success: true,
      message: `Abonnement au plan ${planDef.name} activé avec succès.`,
      subscription: newSubscription
    });

  } catch (error) {
    console.error("❌ Erreur critique backend souscription :", error);
    res.status(500).json({ message: "Erreur serveur lors de la souscription.", error: error.message });
  }
});

export default router;