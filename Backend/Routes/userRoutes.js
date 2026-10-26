import express from "express";
import { z } from "zod";
import { db } from "../db/index.js";
import { isObjectId, isUuid } from "../db/mappers.js";
import { protect, adminOnly } from "../Middleware/AuthMiddleware.js";

const router = express.Router();

const paramsSchema = z.object({
  // UUID PostgreSQL OU ObjectId MongoDB (période de transition)
  id: z.string().refine((val) => isUuid(val) || isObjectId(val), {
    message: "Format d'ID invalide",
  }),
});

router.get("/", protect, adminOnly, async (req, res) => {
  try {
    // Phase 5I : pagination bornée [1..500] — un limit négatif ou démesuré
    // provoquait une erreur SQL (500) ou une lecture abusive.
    const parsed = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 500) : 100;

    const users = await db.users.list({ limit });

    res.json(users);
  } catch {
    res.status(500).json({ message: "Erreur lors de la récupération des utilisateurs" });
  }
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const validation = paramsSchema.safeParse(req.params);
    if (!validation.success) {
      return res.status(400).json({ message: "ID utilisateur non valide" });
    }

    const result = await db.users.deleteById(validation.data.id);
    if (result.ok) {
      return res.json({ message: "Utilisateur supprimé" });
    }
    if (result.reason === "financial_history") {
      // Lot 2C (A6) : refus métier explicite — l'historique financier
      // (paiements/transactions) doit être conservé (intégrité comptable).
      // Message volontairement générique : aucune information interne.
      return res.status(409).json({
        code: "USER_HAS_FINANCIAL_HISTORY",
        message:
          "Suppression refusée : ce compte possède un historique de paiements qui doit être conservé.",
      });
    }
    return res.status(404).json({ message: "Utilisateur non trouvé" });
  } catch {
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
});

export default router;