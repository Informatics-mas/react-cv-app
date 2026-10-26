import jwt from "jsonwebtoken";
// Import explicite : la config ESLint utilise globals.browser, "process" n'est donc pas déclaré
import process from "node:process";
import { db } from "../db/index.js";

/**
 * Retry borné (Phase 5H) — STRICTEMENT réservé aux erreurs d'infrastructure
 * transitoires sur une LECTURE idempotente (SELECT utilisateur) :
 * - concerné : coupures/timeout de connexion (classes SQLSTATE 08xxx/57P03,
 *   ECONNRESET/ETIMEDOUT, "Connection terminated") ;
 * - JAMAIS : erreurs JWT, utilisateur introuvable, erreurs métier ;
 * - 2 nouvelles tentatives max (3 exécutions), backoff 200 ms × 2^n + jitter
 *   0-100 ms (≤ ~600 ms de retard supplémentaire) ;
 * - échec total : l'erreur est relancée → 503 (jamais 401).
 * AUCUNE écriture n'est répétée : quota et transactions ne passent pas par ici.
 */
const INFRA_RETRIES = 2;

function isTransientInfraError(error) {
  if (!error) return false;
  const code = String(error.code || "");
  if (/^(08|57)/.test(code)) return true; // SQLSTATE classes connexion/serveur
  if (["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EPIPE"].includes(code)) return true;
  return /Connection terminated/i.test(String(error.message || ""));
}

async function findByIdentifierWithRetry(id) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.users.findByIdentifier(id);
    } catch (error) {
      if (!isTransientInfraError(error) || attempt >= INFRA_RETRIES) throw error;
      const delay = 200 * 2 ** attempt + Math.floor(Math.random() * 100);
      console.warn(`[DB] retry lookup utilisateur (${attempt + 1}/${INFRA_RETRIES}) dans ${delay}ms :`, error.code || "", error.message);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export const protect = async (req, res, next) => {
  // Phase 3b : le JWT est lu dans le cookie httpOnly (prioritaire) OU, en
  // compatibilité, dans le header Authorization (outils API, anciens clients).
  // Le backend reste l'autorité finale de vérification.
  const authHeader = req.headers.authorization;
  const headerToken =
    authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  const token = req.cookies?.token || headerToken;

  if (!token) {
    return res.status(401).json({ 
      message: "Accès refusé. Aucun token fourni ou format invalide." 
    });
  }

  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in environment variables");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

    // Lot 2G.7 — vérification OBLIGATOIRE de la session (claim `jti`) : un JWT
    // cryptographiquement valide mais sans session ACTIVE est refusé (logout
    // révoqué, session expirée, ancien JWT sans jti, session inconnue).
    if (!decoded.jti || typeof decoded.jti !== "string") {
      return res.status(401).json({
        message: "Session invalide ou expirée, veuillez vous reconnecter."
      });
    }
    let session;
    try {
      session = await db.sessions.findActive(decoded.jti);
    } catch (sessionError) {
      // Échec de stockage : REFUS FERMÉ — jamais d'acceptation silencieuse
      // d'une session non vérifiable (même traitement que toute panne DB).
      console.error("[DB] Vérification de session impossible (protect) :",
        sessionError.code || "", sessionError.message);
      return res.status(503).json({
        success: false,
        code: "DB_UNAVAILABLE",
        message: "Service temporairement indisponible, veuillez réessayer."
      });
    }
    if (!session) {
      return res.status(401).json({
        message: "Session invalide ou expirée, veuillez vous reconnecter."
      });
    }

    // Lookup dual : le claim `id` peut porter un ObjectId MongoDB (JWT émis
    // avant la migration) OU un UUID PostgreSQL — la couche data gère les deux.
    // Phase 5H : retry borné sur cette LECTURE idempotente (voir helper plus bas).
    const currentUser = await findByIdentifierWithRetry(decoded.id || decoded.userId);

    if (!currentUser) {
      return res.status(401).json({ 
        message: "L'utilisateur appartenant à ce token n'existe plus ou a été supprimé." 
      });
    }

    req.user = currentUser;
    // Compat : req.user.id utilisé par les routes (virtual Mongoose).
    // Non énumérable : jamais sérialisé dans les réponses JSON.
    if (currentUser.id === undefined) {
      Object.defineProperty(currentUser, "id", {
        value: currentUser._id,
        enumerable: false
      });
    }

    next();
  } catch (error) {
    // Phase 5H : distinguer STRICTEMENT token invalide (401) et panne
    // d'infrastructure (503). Un 401 déclenche la déconnexion côté frontend :
    // il ne doit JAMAIS être renvoyé pour une coupure réseau ou base de données.
    const isJwtError =
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError";

    if (!isJwtError) {
      console.error("[DB] Erreur infrastructure (protect) :", error.code || "", error.message);
      return res.status(503).json({
        success: false,
        code: "DB_UNAVAILABLE",
        message: "Service temporairement indisponible, veuillez réessayer."
      });
    }

    console.error("[AUTH] Token refusé :", error.name);

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