import express from "express";
import { db } from "../db/index.js";
import { protect, adminOnly } from "../Middleware/AuthMiddleware.js";
import { SUBSCRIPTION_STATUS } from "../constants.js";

const router = express.Router();

router.get("/dashboard-stats", protect, adminOnly, async (req, res) => {
  try {
    const totalUsers = await db.users.count();

    const activeSubs = await db.subscriptions.countByStatus(SUBSCRIPTION_STATUS.ACTIVE);

    res.json({
      users: totalUsers,
      subs: activeSubs,
      revenue: 0
    });
  } catch (error) {
    console.error("Erreur lors du calcul des stats:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des statistiques" });
  }
});

export default router;