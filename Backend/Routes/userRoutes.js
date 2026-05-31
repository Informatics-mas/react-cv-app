import express from "express";
import User from "../Models/user.js"; // Vérifie que ton modèle s'appelle bien user.js
import { protect } from "../Middleware/AuthMiddleware.js";

const router = express.Router();

// @desc    Récupérer tous les utilisateurs
// @route   GET /api/users
router.get("/", protect, async (req, res) => {
  try {
    // On récupère tout sauf les mots de passe
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la récupération des utilisateurs" });
  }
});

// @desc    Supprimer un utilisateur
// @route   DELETE /api/users/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
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