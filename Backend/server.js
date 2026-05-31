import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";
import cors from "cors";
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from "socket.io";
import http from "http";

// --- CONFIGURATION DES CHEMINS ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- IMPORTS DES ROUTES ---
import authRoutes from "./Routes/AuthRoute.js";
import userRoutes from "./Routes/userRoutes.js";
import subscriptionRoutes from "./Routes/subscriptionRoutes.js";
import { protect } from "./Middleware/AuthMiddleware.js";
import statsRoutes from "./Routes/Stats.js";
import planRoutes from "./Routes/PlanRoutes.js";

// 1. Initialisation de Express
const app = express();

// 2. Chargement du .env
dotenv.config({ path: path.join(__dirname, '.env') });

// 3. Création du serveur HTTP
const server = http.createServer(app);

// 4. Initialisation de Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.set("socketio", io);

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
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// --- LA ROUTE PARSE-CV PLACÉE PROPREMENT ICI ---
app.post("/api/parse-cv", upload.single("cv_file"), async (req, res) => {
  try {
    console.log("=== DEBUT DU TRAITEMENT DU CV ===");
    
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier n'a été téléchargé." });
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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    
    return res.json(cleanJson);

  }catch (error) {
    console.error("❌ Erreur critique lors du traitement Gemini :", error);
    
    // Si Google renvoie une surcharge
    if (error.status === 503) {
      return res.status(503).json({ 
        error: "Les serveurs de l'IA sont temporairement surchargés. Veuillez réessayer dans quelques instants." 
      });
    }
    
    return res.status(500).json({ error: "Une erreur est survenue lors de l'analyse." });
  }
});

// Route administrative pour reset
app.post("/api/admin/reset-edition", protect, async (req, res) => {
  try {
    // Ta logique de reset existante...
    res.json({ success: true, message: "L'édition a été réinitialisée ! 🚀" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur lors du reset." });
  }
});

// Route racine par défaut de l'API
app.get("/", (req, res) => {
  res.send("🚀 API CV.CRAFT CONNECTÉ ET OPÉRATIONNELLE ✅");
});

// Middleware Global Catch-All pour les routes non trouvées (Placé TOUT EN BAS)
app.use((req, res) => {
  res.status(404).json({ message: "Route introuvable sur le serveur API." });
});

// --- DEMARRAGE DU SERVEUR ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Le serveur tourne sur le port ${PORT} 🚀`);
});