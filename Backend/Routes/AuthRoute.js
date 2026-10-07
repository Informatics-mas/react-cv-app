import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
// Import explicite : la config ESLint utilise globals.browser, "process" n'est donc pas déclaré
import process from "node:process";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import User from "../Models/user.js";
import { sendWelcomeEmail } from '../utils/emailService.js';
import { protect } from "../Middleware/AuthMiddleware.js";
import { getEffectiveEntitlements } from "../utils/entitlements.js";
import { USER_ROLES, PLAN_NAMES } from "../constants.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5,
  message: { 
    message: "Trop de tentatives échouées. Veuillez réessayer dans 15 minutes." 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(50, "Le nom est trop long"),
  email: z.string().trim().toLowerCase().email("Le format de l'adresse e-mail est invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères")
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Le format de l'adresse e-mail est invalide"),
  password: z.string().min(1, "Le mot de passe est requis")
});

// --- REGISTER - Inscription d'un nouvel utilisateur ---
router.post("/register", authLimiter, async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ message: validation.error.issues[0].message });
    }

    const { name, email, password } = validation.data;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Cette adresse mail ne peut pas être utilisée car elle existe déjà" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: USER_ROLES.USER,
      user_plan: PLAN_NAMES.FREE,
      user_max_downloads: 5
    });

    const savedUser = await newUser.save();

    if (!process.env.JWT_SECRET) {
      console.error("Erreur critique : Configuration d'environnement d'authentification manquante."); 
      return res.status(500).json({ message: "Erreur de configuration serveur" });
    }

    const token = jwt.sign(
      { id: savedUser._id, role: savedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    sendWelcomeEmail(savedUser.email, savedUser.name)
      .then(() => console.log(`✉️ Email de bienvenue envoyé avec succès à ${savedUser.email}`))
      .catch(err => console.error("❌ Échec de l'envoi de l'email de bienvenue :", err));

    res.status(201).json({
      success: true,
      token,
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        user_plan: savedUser.user_plan,
        user_max_downloads: savedUser.user_max_downloads
      },
      message: "Utilisateur créé avec succès ! 🚀"
    });

  } catch (error) {
    console.error("Erreur Register:", error);
    res.status(500).json({ message: "Erreur serveur lors de l'inscription." });
  }
});

// --- LOGIN - Connexion sécurisée ---
router.post("/login", authLimiter, async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ message: validation.error.issues[0].message });
    }

    const { email, password } = validation.data;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("Erreur critique : Configuration d'environnement manquante.");
      return res.status(500).json({ message: "Erreur de configuration serveur" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role}, 
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        user_plan: user.user_plan || "Gratuit"
      },
      message: "Connexion réussie ! 🎉" 
    });

  } catch (error) {
    console.error("Erreur Login:", error);
    res.status(500).json({ message: "Erreur technique lors de la connexion" });
  }
});

// --- NOUVELLE ROUTE : Obtenir le profil connecté en temps réel ---
// Le plan/le quota renvoyés sont CALCULÉS côté serveur (abonnement effectif +
// expiration endDate < now), jamais lus dans le localStorage du client.
router.get("/me", protect, async (req, res) => {
  try {
    const entitlements = await getEffectiveEntitlements(req.user.id);

    if (!entitlements) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const user = entitlements.user;

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      user_plan: entitlements.planName,
      user_max_downloads: entitlements.maxDownloads,
      subscription: {
        plan: entitlements.planName,
        status: entitlements.status,
        endDate: entitlements.endDate,
        maxDownloads: entitlements.maxDownloads,
        downloadsUsed: entitlements.downloadsUsed,
        remaining: entitlements.remaining
      }
    });

  } catch (error) {
    console.error("Erreur /me:", error);
    res.status(500).json({ message: "Erreur serveur lors du chargement du profil" });
  }
});

export default router;