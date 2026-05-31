import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../Models/user.js";
import { protect } from "../Middleware/AuthMiddleware.js"; // 👈 On importe ton middleware de protection

const router = express.Router();

// --- REGISTER - Inscription d'un nouvel utilisateur ---
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Veuillez remplir tous les champs" });
    }

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ message: "Cette adresse mail ne peut pas être utilisée car elle existe déjà" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "user" 
    });

    const savedUser = await newUser.save();

    if (!process.env.JWT_SECRET) {
      console.error("ERREUR : JWT_SECRET non configuré !");
      return res.status(500).json({ message: "Erreur de configuration serveur" });
    }

    const token = jwt.sign(
      { id: savedUser._id, role: savedUser.role }, // 💡 On ne met que le strict minimum dans le token
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      token,
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role
      },
      message: "Utilisateur créé avec succès ! 🚀"
    });

  } catch (error) {
    console.error("Erreur Register:", error);
    res.status(500).json({ message: "Erreur technique lors de l'inscription" });
  }
});

// --- LOGIN - Connexion sécurisée ---
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    if (!process.env.JWT_SECRET) {
      console.error("ERREUR : JWT_SECRET non configuré !");
      return res.status(500).json({ message: "Erreur de configuration serveur" });
    }

    // Génération du Token avec l'ID
    const token = jwt.sign(
      { id: user._id }, 
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
        user_plan: user.user_plan || "Free" // 🔥 On renvoie le plan actuel au login
      },
      message: "Connexion réussie ! 🎉" 
    });

  } catch (error) {
    console.error("Erreur Login:", error);
    res.status(500).json({ message: "Erreur technique lors de la connexion" });
  }
});

// --- 🔥 NOUVELLE ROUTE : Obtenir le profil connecté en temps réel ---
// @route   GET /api/auth/me
router.get("/me", protect, async (req, res) => {
  try {
    // req.user.id provient de ton middleware protect (jwt.verify)
    const user = await User.findById(req.user.id).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    
    // On renvoie un objet plat contenant directement les propriétés pour le frontend
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      user_plan: user.user_plan || "Gratuit",
      user_max_downloads: user.user_max_downloads || 5
    });

  } catch (error) {
    console.error("Erreur /me:", error);
    res.status(500).json({ message: "Erreur serveur lors du chargement du profil" });
  }
});

// Liste des utilisateurs (Pour l'admin)
router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Erreur" });
  }
});

export default router;