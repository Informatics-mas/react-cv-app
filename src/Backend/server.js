import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
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

// 2. Chargement du .env (Doit être fait très tôt)
dotenv.config({ path: path.join(__dirname, '.env') });

// 3. Création du serveur HTTP avec l'app Express
const server = http.createServer(app);

// 4. Initialisation de Socket.io avec le serveur HTTP
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Rendre 'io' accessible dans toutes les routes via req.app.get("socketio")
app.set("socketio", io);

io.on("connection", (socket) => {
  console.log("Admin connecté au flux direct ⚡ ID:", socket.id);
  
  socket.on("disconnect", () => {
    console.log("Un admin s'est déconnecté 🔌");
  });
});


// --- MIDDLEWARES ---
const allowedOrigins = process.env.FRONTEND_URL;

app.use(cors({
  origin: function (origin, callback) {
    // Si pas d'origine (Postman) ou si c'est localhost ou l'URL du .env
    if (!origin || origin.includes("localhost") || (allowedOrigins && allowedOrigins.includes(origin))) {
      callback(null, true);
    } else {
      console.log("Origine rejetée par CORS:", origin);
      callback(new Error('Bloqué par la politique CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/users", userRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use('/uploads', express.static(path.join(path.resolve(), 'uploads')));
app.use("/api/stats", statsRoutes);

// --- CONNEXION MONGODB ---
const connectDB = async () => {
  try {  
    // Utilise cette syntaxe simplifiée (remplace par ton mot de passe si besoin)
    const uri = process.env.MONGO_URI || "mongodb+srv://ogouogoudavid_db_user:CVCRAFT123@cluster0.cbun99x.mongodb.net/?appName=Cluster0";
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000 // Évite d'attendre 10s pour rien
    });
    console.log("MongoDB connecté avec succès ✅");
  } catch (err) {
    console.error("Erreur de connexion MongoDB ❌ :", err.message);
    // On ne coupe plus le serveur pour pouvoir debugger
  }
};
connectDB();

// --- BRANCHEMENT DES ROUTES API ---
app.use("/api/auth", authRoutes);

app.post("/api/admin/reset-edition", protect, async (req, res) => {
  try {
    await Promise.all([
      Reservation.deleteMany({}),
      Don.deleteMany({})
    ]);

    const stands = await StandType.find({});
    for (let stand of stands) {
      stand.totalDisponible = stand.capaciteTotale || 10; 
      await stand.save();
    }

    res.json({ success: true, message: "L'édition a été réinitialisée ! 🚀" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur lors du reset." });
  }
});

app.get("/", (req, res) => {
  res.send("🚀 API CV.CRAFT est opérationnelle !");
});

app.use((req, res) => {
  res.status(404).json({ message: "Route introuvable." });
});

// --- DÉMARRAGE DU SERVEUR (Utiliser 'server.listen' et non 'app.listen') ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Serveur Informatics en direct sur le port ${PORT} 🚀`);
});