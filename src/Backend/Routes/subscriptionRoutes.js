import express from "express";
import Subscription from "../Models/subscriptions.js";
import { protect } from "../Middleware/AuthMiddleware.js";

const router = express.Router();

// @desc    Récupérer tous les abonnements (avec détails User et Plan)
// @route   GET /api/subscriptions
router.get("/", protect, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({})
      .populate("userId", "name email") // Remplace l'ID par l'objet User (nom et email)
      .populate("planId", "name price") // Remplace l'ID par l'objet Plan
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

export default router;