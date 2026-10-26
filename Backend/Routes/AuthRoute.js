// ============================================================================
// Routes d'authentification (register, login, logout, /me).
// NOTE TRAÇABILITÉ : fichier reconstitué le 2026-10-22 après un incident de
// manipulation (Lot 2G.7 — commande sed malformée ayant détruit le contenu).
// Reconstruction fidèle : imports, cookies httpOnly (Phase 3b), schémas zod,
// register/login/logout (contrats inchangés) et /me (getEffectiveEntitlements),
// validée par la batterie de tests complète — voir
// LOT2G7-REVOCATION-JWT-RAPPORT-FINAL.md (§ Incident).
// ============================================================================
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

import process from "node:process";
import { z } from "zod";
import rateLimit from "express-rate-limit";
import { db } from "../db/index.js";
import { sendWelcomeEmail } from '../utils/emailService.js';
import { protect } from "../Middleware/AuthMiddleware.js";
import { getEffectiveEntitlements } from "../utils/entitlements.js";
import { USER_ROLES, PLAN_NAMES } from "../constants.js";

/**
 * Cookies d'authentification — Phase 3b : le JWT est livré en cookie httpOnly
 * (jamais dans le corps JSON, donc inaccessible à JavaScript) avec repli
 * header Authorization pour les outils API.
 * - httpOnly : inaccessible au JavaScript côté client (anti-XSS) ;
 * - secure   : uniquement HTTPS en production ;
 * - sameSite "lax" : fonctionne en dev (localhost:3000 ↔ localhost:5000 = même
 *   site, les cookies ignorent les ports) et en prod si front et back partagent
 *   un même domaine enregistrable (voir COOKIE_DOMAIN).
 * - domain   : optionnel — à définir en prod (ex: .exemple.com) pour que le
 *   middleware Next.js du front puisse lire le cookie.
 * La durée (1 jour) aligne l'expiration du cookie sur celle du JWT (expiresIn: "1d").
 */
const AUTH_COOKIE = "token";
const authCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  domain: process.env.COOKIE_DOMAIN || undefined,
  maxAge: 24 * 60 * 60 * 1000
});

const setAuthCookie = (res, token) => res.cookie(AUTH_COOKIE, token, authCookieOptions());
const clearAuthCookie = (res) =>
  res.clearCookie(AUTH_COOKIE, { ...authCookieOptions(), maxAge: undefined });

// --- Lot 2G.7 — sessions JWT révocables ---------------------------------
// Chaque JWT émis porte un claim `jti` (identifiant de session unique) et la
// session est enregistrée côté serveur (registre `user_sessions` / UserSession).
// Le logout révoque la session AVANT de confirmer ; toute requête ultérieure
// avec le même JWT est refusée par le middleware (même si le token est encore
// cryptographiquement valide). TTL aligné sur expiresIn "1d" (inchangé).
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const issueSessionToken = async (user) => {
  const userId = user.id ?? user._id;
  const jti = randomUUID();
  await db.sessions.create({ jti, userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) });
  // Rétention opportuniste : purge des sessions expirées (> 7 jours).
  db.sessions.purgeExpired().catch(() => {});
  return jwt.sign(
    { id: userId, role: user.role, jti },
    process.env.JWT_SECRET,
    { expiresIn: "1d", algorithm: "HS256" }
  );
};

// --- Rate limiting : 5 tentatives par fenêtre de 15 minutes (inchangé) ---
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
  email: z.string().trim().toLowerCase().email("Le format de l'adresse e-mail est invalide").max(254, "L'adresse e-mail est trop longue"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères")
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Le format de l'adresse e-mail est invalide").max(254, "L'adresse e-mail est trop longue"),
  password: z.string().min(1, "Le mot de passe est requis")
});

const router = express.Router();

// --- REGISTER - Inscription d'un nouvel utilisateur ---
router.post("/register", authLimiter, async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ message: validation.error.issues[0].message });
    }

    const { name, email, password } = validation.data;

    const userExists = await db.users.findByEmail(email);
    if (userExists) {
      return res.status(400).json({ message: "Cette adresse mail ne peut pas être utilisée car elle existe déjà" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const savedUser = await db.users.create({
      name,
      email,
      password: hashedPassword,
      role: USER_ROLES.USER,
      user_plan: PLAN_NAMES.FREE,
      user_max_downloads: 5
    });

    if (!process.env.JWT_SECRET) {
      console.error("Erreur critique : Configuration d'environnement d'authentification manquante.");
      return res.status(500).json({ message: "Erreur de configuration serveur" });
    }

    // Lot 2G.7 : JWT à session enregistrée (claim `jti`, révocable au logout).
    const token = await issueSessionToken(savedUser);

    sendWelcomeEmail(savedUser.email, savedUser.name)
      .then(() => console.log(`✉️ Email de bienvenue envoyé avec succès à ${savedUser.email}`))
      .catch(err => console.error("❌ Échec de l'envoi de l'email de bienvenue :", err));

    // Phase 3b : le JWT est livré en cookie httpOnly (jamais dans le corps JSON,
    // donc inaccessible à JavaScript). Le body reste compatible pour `user`.
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      user: {
        id: savedUser.id ?? savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        user_plan: savedUser.user_plan || "Gratuit"
      },
      message: "Inscription réussie ! 🎉"
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

    const user = await db.users.findByEmail(email);
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

    // Lot 2G.7 : JWT à session enregistrée (claim `jti`, révocable au logout).
    const token = await issueSessionToken(user);

    // Phase 3b : JWT livré en cookie httpOnly uniquement (voir setAuthCookie).
    setAuthCookie(res, token);

    res.json({
      user: {
        id: user.id ?? user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        user_plan: user.user_plan || "Gratuit"
      },
      message: "Connexion réussie ! 🎉"
    });
  } catch (error) {
    console.error("Erreur Login:", error);
    res.status(500).json({ message: "Erreur serveur lors de la connexion." });
  }
});

// --- LOGOUT - Déconnexion avec RÉVOCATION de session (Lot 2G.7) ---
router.post("/logout", async (req, res) => {
  // Révocation de la session côté serveur AVANT de confirmer la déconnexion.
  // Sûr et idempotent : cookie absent, token expiré, invalide ou déjà révoqué →
  // réponse identique (aucune fuite d'information interne).
  const authHeader = req.headers.authorization;
  const headerToken = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1] : null;
  const token = req.cookies?.token || headerToken;
  if (token) {
    let decoded = null;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    } catch {
      // Token inexploitable : aucune session à révoquer (comportement identique).
    }
    if (decoded?.jti && typeof decoded.jti === "string") {
      try {
        await db.sessions.revoke(decoded.jti);
      } catch (revokeError) {
        // Fail-closed (Lot 2G.7.1) : tant que la révocation n'est PAS confirmée
        // en stockage, la déconnexion n'est PAS confirmée et le cookie est
        // CONSERVÉ (une nouvelle tentative pourra révoquer) — une panne de
        // stockage ne doit jamais contourner la révocation.
        console.error("[DB] Révocation de session impossible (logout) :",
          revokeError.code || "", revokeError.message);
        return res.status(503).json({
          success: false,
          code: "DB_UNAVAILABLE",
          message: "Service temporairement indisponible, veuillez réessayer."
        });
      }
    }
  }
  clearAuthCookie(res);
  res.json({ success: true, message: "Déconnexion réussie." });
});

// --- NOUVELLE ROUTE : Obtenir le profil connecté en temps réel ---
// Le plan/le quota renvoyés sont CALCULÉS côté serveur (abonnement effectif +
// expiration endDate < now), jamais lus dans le localStorage du client.
router.get("/me", protect, async (req, res) => {
  try {
    const ent = await getEffectiveEntitlements(req.user.id ?? req.user._id);
    if (!ent) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }
    const u = ent.user;
    res.json({
      id: u.id ?? u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      subscription: {
        id: ent.subscriptionId ?? null,
        plan: ent.planName,
        status: ent.status,
        endDate: ent.endDate ?? null,
        downloadsUsed: ent.downloadsUsed,
        maxDownloads: ent.maxDownloads,
        remaining: ent.remaining
      }
    });
  } catch (error) {
    console.error("Erreur /me:", error);
    res.status(500).json({ message: "Erreur serveur lors de la récupération du profil." });
  }
});

export default router;
