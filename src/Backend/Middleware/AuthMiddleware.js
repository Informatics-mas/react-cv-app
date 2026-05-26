import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  // 1. Vérification de la présence et du format du header Authorization
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ 
      message: "Accès refusé. Aucun token fourni ou format invalide." 
    });
  }

  // 2. Extraction du token
  const token = authHeader.split(" ")[1];

  try {
    // 3. Vérification de la clé secrète
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    // 4. Décodage et vérification du token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 5. Injection des données de l'utilisateur dans la requête
    // Cela permet d'accéder à req.user.id et req.user.role dans les routes suivantes
    req.user = decoded;

    next();
  } catch (error) {
    console.error("Middleware Auth Error:", error.message);

    // Gestion spécifique des jetons expirés
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Votre session a expiré, veuillez vous reconnecter." });
    }

    res.status(401).json({ message: "Token invalide ou corrompu." });
  }
};