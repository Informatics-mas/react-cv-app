import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../Models/user.js";

const router = express.Router();

// --- REGISTER - Inscription d'un nouvel utilisateur ---
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Vérification que tous les champs sont présents
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Veuillez remplir tous les champs" });
    }

    // 2. Vérifier si l'utilisateur existe déjà
    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ message: "Cet utilisateur existe déjà" });
    }

    // 3. Hachage du mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Création de l'utilisateur
    const newUser = new User({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "user" // Rôle par défaut
    });

    const savedUser = await newUser.save();

    // 5. Vérification de la clé secrète JWT
    if (!process.env.JWT_SECRET) {
      console.error("ERREUR : JWT_SECRET non configuré !");
      return res.status(500).json({ message: "Erreur de configuration serveur" });
    }

    // 6. Génération du Token pour connecter l'utilisateur immédiatement
    const token = jwt.sign(
      { id: savedUser._id, email: savedUser.email, role: savedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
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

    // 1. Vérification de l'existence de l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!user) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // 2. Comparaison du mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // 3. Vérification de la clé secrète JWT
    if (!process.env.JWT_SECRET) {
      console.error("ERREUR : JWT_SECRET non configuré !");
      return res.status(500).json({ message: "Erreur de configuration serveur" });
    }

    // 4. Génération du Token (Valide 24h)
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // 5. Réponse au Frontend
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      },
      message: "Connexion réussie ! 🎉" 
    });

  } catch (error) {
    console.error("Erreur Login:", error);
    res.status(500).json({ message: "Erreur technique lors de la connexion" });
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Erreur" });
  }
});

export default router;