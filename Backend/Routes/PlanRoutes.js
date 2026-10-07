import express from "express";
import Plans from "../Models/plans.js";
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
    const plans = await Plans.find().sort({ price: 1 }).limit(20);
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
    
    const newPlan = new Plans(validation.data); 
    const savedPlan = await newPlan.save();
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

    const updatedPlan = await Plans.findByIdAndUpdate(req.params.id, { $set: validation.data }, { new: true });
    if (!updatedPlan) return res.status(404).json({ message: "Plan introuvable." });
    res.status(200).json(updatedPlan);
  } catch {
    res.status(400).json({ message: "Erreur lors de la mise à jour du plan" });
  }
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const deletedPlan = await Plans.findByIdAndDelete(req.params.id);
    if (!deletedPlan) return res.status(404).json({ message: "Plan introuvable." });
    res.status(200).json({ message: "Plan supprimé !" });
  } catch {
    res.status(500).json({ message: "Erreur lors de la suppression du plan" });
  }
});

export default router;