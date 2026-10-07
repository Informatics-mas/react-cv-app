import express from "express";
import { protect } from "../Middleware/AuthMiddleware.js";
import User from "../Models/user.js";
import { getEffectiveEntitlements } from "../utils/entitlements.js";

const router = express.Router();

/**
 * POST /api/downloads/authorize
 * Réservation (autorisation) d'un téléchargement PDF.
 * La génération du PDF reste côté navigateur (react-to-print) ; ce routeur
 * est la SOURCE DE VÉRITÉ du quota : le client ne peut pas forcer le compteur.
 *
 * Incrément atomique MongoDB ($inc) gardé par $lt : deux requêtes simultanées
 * ne peuvent pas dépasser maxDownloads (pas de read-then-write).
 */
router.post("/authorize", protect, async (req, res) => {
  try {
    const entitlements = await getEffectiveEntitlements(req.user.id);
    if (!entitlements) {
      return res.status(401).json({ message: "Utilisateur introuvable." });
    }

    const limit = entitlements.maxDownloads;

    const updatedUser = await User.findOneAndUpdate(
      { _id: req.user.id, downloadsUsed: { $lt: limit } },
      { $inc: { downloadsUsed: 1 } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(403).json({
        success: false,
        code: "QUOTA_EXCEEDED",
        message: "Votre quota de téléchargement est atteint."
      });
    }

    return res.json({
      success: true,
      data: {
        downloadsUsed: updatedUser.downloadsUsed,
        limit,
        remaining: Math.max(limit - updatedUser.downloadsUsed, 0)
      }
    });
  } catch (error) {
    console.error("Erreur /downloads/authorize:", error);
    res.status(500).json({ message: "Erreur serveur lors de la réservation du téléchargement." });
  }
});

export default router;
