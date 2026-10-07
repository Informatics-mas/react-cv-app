import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";
import path from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import helmet from "helmet";
import rateLimit from "express-rate-limit";
// Import explicite : la config ESLint utilise globals.browser, "process" n'est donc pas déclaré
import process from "node:process";

// --- IMPORTS DES MODÈLES ---
import User from './Models/user.js'; 
import Subscription from './Models/subscriptions.js';

// --- IMPORTS DES SERVICES ---
import { sendExpirationWarningEmail } from './utils/emailService.js';
import { getEffectiveEntitlements } from './utils/entitlements.js';
import { SUBSCRIPTION_STATUS, PLAN_NAMES } from './constants.js';

// --- CONFIGURATION DES CHEMINS ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- IMPORTS DES ROUTES ---
import authRoutes from "./Routes/AuthRoute.js";
import userRoutes from "./Routes/userRoutes.js";
import subscriptionRoutes from "./Routes/subscriptionRoutes.js";
import { protect } from "./Middleware/AuthMiddleware.js";
import { responseFormat } from "./Middleware/responseFormat.js";
import statsRoutes from "./Routes/Stats.js";
import planRoutes from "./Routes/PlanRoutes.js";
import downloadRoutes from "./Routes/downloadRoutes.js";

// 1. Initialisation de Express
const app = express();

// 2. Chargement du .env
dotenv.config({ path: path.join(__dirname, '.env') });

// --- SÉCURITÉ : JWT_SECRET OBLIGATOIRE ---
// Le serveur refuse de démarrer sans secret : jamais de fallback faible.
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET manquant dans Backend/.env. Le serveur refuse de démarrer. (openssl rand -hex 64)");
  process.exit(1);
}

// --- TRUST PROXY ---
// Désactivé par défaut : si le serveur est exposé directement, un en-tête
// X-Forwarded-For forgé ne doit pas fausser l'IP client (rate-limit).
// En production derrière un reverse proxy, définir TRUST_PROXY=1 (nb de sauts).
const trustProxyHops = parseInt(process.env.TRUST_PROXY ?? "", 10);
if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) {
  app.set("trust proxy", trustProxyHops);
}

// --- CONFIGURATION DE MULTER (STOCKAGE EN MÉMOIRE COHÉRENT) ---
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite à 5 Mo
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Seuls les fichiers PDF sont acceptés !"), false);
    }
  }
});

// --- MIDDLEWARES GLOBAUX ---
// Sécurité : en-têtes HTTP (Helmet).
// - crossOriginResourcePolicy "cross-origin" : le front (Vercel) appelle cette API en CORS,
//   on ne bloque donc pas les réponses cross-origin.
// - crossOriginEmbedderPolicy désactivé : inutile pour une API JSON et risque de casser
//   le chargement de ressources cross-origin côté front.
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: "2mb" })); 
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
// Convention de réponse : { success, data?, message?, code? } (voir Middleware/responseFormat.js)
app.use(responseFormat);

// --- CONFIGURATION GEMINI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// --- CONNEXION MONGODB ---
const connectDB = async () => {
  try {  
    const uri = process.env.MONGO_URI;
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log("MongoDB connecté avec succès ✅");
  } catch (err) {
    console.error("Erreur de connexion MongoDB ❌ :", err.message);
  }
};
connectDB();

// ========================================================
// --- BRANCHEMENT ET REGROUPEMENT DE TOUTES LES ROUTES API ---
// ========================================================

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/downloads", downloadRoutes);

// --- RATE-LIMIT SPÉCIFIQUE PARSE-CV : 10 analyses / heure / utilisateur ---
// Placé APRÈS "protect" : la clé est l'ID utilisateur issu du JWT vérifié,
// jamais une valeur envoyée par le frontend.
const parseCvLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // fenêtre de 1 heure
  limit: 10,                // 10 analyses par heure et par utilisateur
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user && req.user.id ? String(req.user.id) : "anonymous"),
  message: { success: false, message: "Trop d'analyses de CV effectuées. Veuillez réessayer dans une heure.", code: "RATE_LIMITED" }
});

// --- GATING PREMIUM SERVEUR (IA) ---
// Le frontend masque déjà la fonctionnalité, mais le backend reste l'autorité :
// un utilisateur Free/Basic (curl, Postman, script) reçoit 403 PREMIUM_REQUIRED.
// Source de vérité : getEffectiveEntitlements (même calcul que /auth/me et le quota).
const premiumOnly = async (req, res, next) => {
  try {
    const entitlements = await getEffectiveEntitlements(req.user.id);
    if (!entitlements) {
      return res.status(401).json({ message: "Utilisateur introuvable." });
    }

    if (entitlements.planName !== PLAN_NAMES.PREMIUM) {
      return res.status(403).json({
        success: false,
        message: "Cette fonctionnalité est réservée au plan Premium.",
        code: "PREMIUM_REQUIRED"
      });
    }

    next();
  } catch (error) {
    console.error("Erreur gating premium IA:", error);
    res.status(500).json({ message: "Erreur serveur lors du contrôle des droits." });
  }
};

// --- ROUTE PARSE-CV (REMISE AVEC TON PROMPT COMPLET) ---
// Protégée : JWT obligatoire (401 sinon), plan Premium requis (403 sinon),
// puis quota anti-abus avant toute consommation Gemini.
app.post("/api/parse-cv", protect, premiumOnly, parseCvLimiter, upload.single("cv_file"), async (req, res) => {
  try {
    console.log("=== DEBUT DU TRAITEMENT DU CV ===");
    
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier n'a été téléchargé." });
    }

    console.log("📄 Fichier reçu :", req.file.originalname);
    console.log("📦 Taille :", req.file.size, "octets");

    // Conversion du buffer mémoire en format compatible Gemini API
    const pdfPart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: "application/pdf"
      }
    };

    // Sélection du modèle flash rapide et optimisé pour le processing documentaire binaire
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // RESTAURATION DE TON PROMPT D'ORIGINE COMPLET 🔥
    const prompt = `
      Tu es un expert en recrutement et un système d'extraction de données de CV hautement qualifié.
      Analyse attentivement le document PDF joint (qui est un CV) et extrait TOUTES les informations textuelles disponibles.
      
      Génère STRICTEMENT un objet JSON valide contenant les données structurées selon le modèle exact fourni ci-dessous.
      
      ⚠️ ATTENTION OBLIGATOIRE :
      1. Réponds UNIQUEMENT avec le code JSON brut. Ne commence JAMAIS ta réponse par des blocs de code Markdown comme \`\`\`json ou \`\`\`. Ne mets aucun texte d'explication avant ou après le JSON.
      2. Si une information est absente, laisse une chaîne vide "" ou un tableau vide [].
      3. Traduis les rubriques ou adapte-les logiquement si nécessaire pour matcher la structure demandée.
      
      Voici la structure JSON exacte attendue :
      {
        "general": {
          "name": "Nom complet du candidat",
          "title": "Titre professionnel ciblé ou poste actuel (ex: Développeur Fullstack)",
          "email": "Adresse email trouvée",
          "phone": "Numéro de téléphone",
          "summary": "Résumé de profil ou accroche professionnelle"
        },
        "education": [
          { "id": 1, "school": "Nom de l'école / Université", "title": "Diplôme ou certification obtenue", "date": "Période (ex: 2020 - 2023)" }
        ],
        "experience": [
          { "id": 1, "company": "Nom de l'entreprise", "position": "Poste occupé", "desc": "Description des tâches", "start": "Année début", "end": "Année fin ou Présent" }
        ],
        "skills": [
          { "id": 1, "nom": "Nom de la compétence (ex: React, Management, Gestion de projet)" }
        ],
        "langue": [
          { "id": 1, "nom": "Langue", "niveau": "Niveau (ex: Courant, Bilingue, A2...)" }
        ],
        "hobbi": [
          { "id": 1, "loisir": "Intérêt ou activité" }
        ]
      }
    `;

    console.log("🚀 Envoi du document binaire à l'IA Gemini...");
    const response = await model.generateContent([prompt, pdfPart]);
    let resultText = response.response.text().trim();

    // Nettoyage de sécurité au cas où l'IA renverrait quand même du Markdown
    if (resultText.startsWith("```")) {
      resultText = resultText
        .replace(/^```json/, "")
        .replace(/^```/, "")
        .replace(/```$/, "")
        .trim();
    }

    const cleanJson = JSON.parse(resultText);
    console.log("✅ Extraction directe réussie avec succès !");
    console.log("=== FIN DU TRAITEMENT ===\n");
    
    return res.json({ success: true, data: cleanJson });

  } catch (error) {
    console.error("❌ Erreur critique lors du traitement Gemini :", error);
    
    if (error.status === 503) {
      return res.status(503).json({ 
        message: "Les serveurs de l'IA sont temporairement surchargés. Veuillez réessayer dans quelques instants." 
      });
    }
    
    return res.status(500).json({ message: "Une erreur est survenue lors de l'analyse." });
  }
});

// Route racine par défaut de l'API
app.get("/", (req, res) => {
  res.send("🚀 API CV.CRAFT CONNECTÉ ET OPÉRATIONNELLE ✅");
});

// --- CRON JOB : PRÉVENTION J-7 AVANT EXPIRATION ---
cron.schedule('0 1 * * *', async () => {
  console.log("⏰ TÂCHE CRON : Vérification des abonnements expirant à J-7...");

  try {
    const today = new Date();
    
    const targetDateStart = new Date();
    targetDateStart.setDate(today.getDate() + 7);
    targetDateStart.setHours(0, 0, 0, 0);

    const targetDateEnd = new Date();
    targetDateEnd.setDate(today.getDate() + 7);
    targetDateEnd.setHours(23, 59, 59, 999);

    const subscriptionsToWarn = await Subscription.find({
      endDate: {
        $gte: targetDateStart,
        $lte: targetDateEnd
      },
      status: SUBSCRIPTION_STATUS.ACTIVE
    }).populate("userId").populate("planId");

    console.log(`✉️ ${subscriptionsToWarn.length} abonnement(s) expire(nt) dans 7 jours.`);

    for (const sub of subscriptionsToWarn) {
      if (!sub.userId || !sub.planId) continue;

      if (sub.planId.name === PLAN_NAMES.FREE) {
        continue;
      }

      await sendExpirationWarningEmail(sub.userId.email, sub.userId.name, sub.planId.name);
      console.log(`[Notification J-7 envoyée] 📬 Mail envoyé à ${sub.userId.email} pour le plan ${sub.planId.name}`);
    }

  } catch (error) {
    console.error("❌ Erreur lors de l'exécution de la tâche Cron J-7 :", error);
  }
});

// Middleware Global Catch-All pour les routes non trouvées
app.use((req, res) => {
  res.status(404).json({ message: "Route introuvable sur le serveur API." });
});

// --- DEMARRAGE DU SERVEUR ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Le serveur tourne sur le port ${PORT} 🚀`);
});