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
  } catch (error) {
    res.status(500).json({ message: "Erreur", error: error.message });
  }
});

router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const validation = planSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: "Données invalides", errors: validation.error.errors });
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
  } catch (error) {
    res.status(400).json({ message: "Échec création", error: error.message });
  }
});

router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const validation = planSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ message: "Données invalides", errors: validation.error.errors });
    }

    const updatedPlan = await Plans.findByIdAndUpdate(req.params.id, { $set: validation.data }, { new: true });
    if (!updatedPlan) return res.status(404).json({ message: "Plan introuvable." });
    res.status(200).json(updatedPlan);
  } catch (error) {
    res.status(400).json({ message: "Erreur mise à jour", error: error.message });
  }
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const deletedPlan = await Plans.findByIdAndDelete(req.params.id);
    if (!deletedPlan) return res.status(404).json({ message: "Plan introuvable." });
    res.status(200).json({ message: "Plan supprimé !" });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression", error: error.message });
  }
});

export default router;