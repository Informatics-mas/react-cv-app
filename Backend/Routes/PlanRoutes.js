import express from "express";
import { db } from "../db/index.js";
import { protect, adminOnly } from "../Middleware/AuthMiddleware.js";
import { z } from "zod";

const router = express.Router();

const planSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  duree: z.number().min(1),
  maxDownloads: z.number().min(2),
  features: z.union([z.string(), z.array(z.string())]),
  description: z.string().min(10),
  isPopular: z.boolean().optional()
});

router.get("/", async (req, res) => {
  try {
    const plans = await db.plans.list();
    res.status(200).json(plans);
  } catch {
    res.status(500).json({ message: "Erreur lors de la récupération des plans" });
  }
});

router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const validation = planSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: "Données invalides", errors: validation.error.issues.map(issue => issue.message) });
    }
    
    const savedPlan = await db.plans.create(validation.data);
    res.status(201).json({
        _id: savedPlan._id,
        name: savedPlan.name,
        price: savedPlan.price,
        duree: savedPlan.duree,
        maxDownloads: savedPlan.maxDownloads
    });
  } catch {
    res.status(400).json({ message: "Échec de la création du plan" });
  }
});

router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const validation = planSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: "Données invalides", errors: validation.error.issues.map(issue => issue.message) });
    }

    const updatedPlan = await db.plans.update(req.params.id, validation.data);
    if (!updatedPlan) return res.status(404).json({ message: "Plan introuvable." });
    res.status(200).json(updatedPlan);
  } catch (err) {
    // Ne pas masquer la cause : distinguer l'indisponibilité DB/réseau (503)
    // d'une erreur de requête (400) — message identique pour l'utilisateur,
    // détail technique journalisé sans secret.
    console.error("❌ PUT /plans/:id :", err?.code || "", err?.message || err);
    if (err?.code && ["ETIMEDOUT", "ECONNREFUSED", "ECONNRESET", "ENETUNREACH", "EPIPE", "57P03"].includes(err.code)) {
      return res.status(503).json({ message: "Base de données indisponible : la mise à jour du plan n'a pas été appliquée. Réessayez." });
    }
    res.status(400).json({ message: "Erreur lors de la mise à jour du plan" });
  }
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const result = await db.plans.deleteById(req.params.id);
    if (result.ok) {
      return res.status(200).json({ message: "Plan supprimé !" });
    }
    if (result.reason === "has_subscriptions") {
      // Lot 2G.1 : refus métier explicite — un plan référencé par des
      // abonnements n'est jamais supprimé (historique préservé, aucune cascade).
      return res.status(409).json({
        code: "PLAN_HAS_SUBSCRIPTIONS",
        message:
          "Suppression refusée : ce plan est encore référencé par des abonnements.",
      });
    }
    return res.status(404).json({ message: "Plan introuvable." });
  } catch {
    res.status(500).json({ message: "Erreur lors de la suppression du plan" });
  }
});

export default router;