import jwt from "jsonwebtoken";
import User from "../Models/user.js";

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ 
      message: "Accès refusé. Aucun token fourni ou format invalide." 
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const currentUser = await User.findById(decoded.id || decoded.userId);
    
    if (!currentUser) {
      return res.status(401).json({ 
        message: "L'utilisateur appartenant à ce token n'existe plus ou a été supprimé." 
      });
    }

    req.user = currentUser;

    next();
  } catch (error) {
    console.error("Middleware Auth Error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ 
        message: "Votre session a expiré, veuillez vous reconnecter." 
      });
    }

    res.status(401).json({ message: "Token invalide ou corrompu." });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Accès refusé. Privilèges administrateur requis." });
  }
};