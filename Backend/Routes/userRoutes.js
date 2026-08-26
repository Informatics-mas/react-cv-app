import express from "express";
import mongoose from "mongoose";
import { z } from "zod";
import User from "../Models/user.js";
import { protect, adminOnly } from "../Middleware/AuthMiddleware.js";

const router = express.Router();

const paramsSchema = z.object({
  id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Format d'ID invalide",
  }),
});

router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    
    const users = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 })
      .limit(limit);
      
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des utilisateurs" });
  }
});

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const validation = paramsSchema.safeParse(req.params);
    if (!validation.success) {
      return res.status(400).json({ message: "ID utilisateur non valide" });
    }

    const user = await User.findById(validation.data.id);
    if (user) {
      await user.deleteOne();
      res.json({ message: "Utilisateur supprimé" });
    } else {
      res.status(404).json({ message: "Utilisateur non trouvé" });
    }
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
});

export default router;