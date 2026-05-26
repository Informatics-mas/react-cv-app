import express from "express";
import Plans from "../Models/plans.js"; // Vérifie que le chemin vers ton modèle est exact
// import { protect } from "../Middleware/AuthMiddleware.js"; // Décommente pour sécuriser

const router = express.Router();

/**
 * @route   GET /api/plans
 * @desc    Récupérer tous les plans
 * @access  Public
 */
router.get("/", async (req, res) => {
  try {
    const plans = await Plans.find().sort({ price: 1 });
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ 
      message: "Erreur lors de la récupération des plans", 
      error: error.message 
    });
  }
});

/**
 * @route   POST /api/plans
 * @desc    Créer un nouveau plan
 * @access  Private (Admin)
 */
router.post("/", async (req, res) => {
  try {
    const { name, price, duree, features, description, isPopular } = req.body;

    const newPlan = new Plans({
      name,
      price,
      duree,
      features,
      description,
      isPopular
    });

    const savedPlan = await newPlan.save();
    res.status(201).json(savedPlan);
  } catch (error) {
    res.status(400).json({ 
      message: "Échec de la création du plan. Vérifiez vos données.", 
      error: error.message 
    });
  }
});

/**
 * @route   PUT /api/plans/:id
 * @desc    Modifier un plan existant
 * @access  Private (Admin)
 */
router.put("/:id", async (req, res) => {
  try {
    const updatedPlan = await Plans.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true } // runValidators force le respect du schéma (enum, minLength, etc.)
    );

    if (!updatedPlan) {
      return res.status(404).json({ message: "Plan introuvable." });
    }

    res.status(200).json(updatedPlan);
  } catch (error) {
    res.status(400).json({ 
      message: "Erreur lors de la mise à jour", 
      error: error.message 
    });
  }
});

/**
 * @route   DELETE /api/plans/:id
 * @desc    Supprimer un plan
 * @access  Private (Admin)
 */
router.delete("/:id", async (req, res) => {
  try {
    const deletedPlan = await Plans.findByIdAndDelete(req.params.id);

    if (!deletedPlan) {
      return res.status(404).json({ message: "Plan introuvable." });
    }

    res.status(200).json({ message: "Plan supprimé avec succès !" });
  } catch (error) {
    res.status(500).json({ 
      message: "Erreur lors de la suppression", 
      error: error.message 
    });
  }
});

export default router;