import express from "express";
import User from "../Models/user.js"; 

const router = express.Router();

router.get("/dashboard-stats", async (req, res) => {
  try {
    // On compte le nombre réel d'utilisateurs dans ta collection MongoDB
    const totalUsers = await User.countDocuments();
    
    // On compte ceux qui ont un rôle admin ou un champ spécifique si tu en as
    // Pour l'instant on filtre par role: "admin" ou on laisse 0
    const activeSubs = await User.countDocuments({ role: "admin" });

    res.json({
      users: totalUsers,
      subs: activeSubs,
      revenue: 0 // Tu pourras calculer ça plus tard
    });
  } catch (error) {
    console.error("Erreur lors du calcul des stats:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des statistiques" });
  }
});

// EXPORTATION INDISPENSABLE
export default router;