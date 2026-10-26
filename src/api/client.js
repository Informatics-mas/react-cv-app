/**
 * Client API centralisé — usage progressif du projet CV.CRAFT.
 *
 * Centralise : base URL, Authorization (JWT), headers JSON, parsing,
 * et la traduction des codes HTTP en messages utilisateur (Groupe 9).
 *
 * Usage :
 *   const body = await api.get("/plans");           // renvoie le JSON décodé
 *   const body = await api.post("/auth/login", data);
 *   try { ... } catch (err) { err.status, err.code, err.message }
 */
/**
 * Source UNIQUE de l'URL de l'API : aucun autre fichier du front ne doit
 * référencer process.env.NEXT_PUBLIC_API_URL directement.
 * Fallback localhost = développement uniquement ; en production, définir
 * NEXT_PUBLIC_API_URL (ex : https://ton-backend-domaine.com/api) dans Vercel.
 * NB : l'URL contient déjà le préfixe /api — les appels utilisent donc
 * des chemins comme "/auth/me" (jamais "/api/auth/me").
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const BASE_URL = API_BASE_URL;

export class ApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code || null;
  }
}

/** Traduit un code HTTP en message utilisateur (le message du serveur reste prioritaire). */
function messageForStatus(status, serverMessage) {
  if (serverMessage) return serverMessage;
  switch (status) {
    case 401: return "Session expirée, veuillez vous reconnecter.";
    case 403: return "Accès refusé : vous n'avez pas les droits nécessaires.";
    case 404: return "Ressource introuvable.";
    case 409: return "Conflit : cette ressource a déjà été modifiée.";
    case 422: return "Données invalides.";
    case 429: return "Trop de requêtes, veuillez réessayer plus tard.";
    default:
      if (status >= 500) return "Erreur serveur, veuillez réessayer plus tard.";
      return "Une erreur est survenue.";
  }
}

async function request(path, { method = "GET", body, headers = {}, auth = true, raw = false } = {}) {
  const finalHeaders = { ...headers };

  if (auth) {
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let payload;
  if (body instanceof FormData) {
    payload = body; // laisser le navigateur poser le boundary multipart
  } else if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: payload,
      // Auth par cookie httpOnly (contrat backend Phase 3b) : transmet et
      // reçoit les cookies cross-origin (CORS credentials:true côté serveur).
      credentials: "include"
    });
  } catch {
    // Erreur réseau : jamais de texte technique pour l'utilisateur
    throw new ApiError(0, "Serveur injoignable, vérifiez votre connexion.", "NETWORK_ERROR");
  }

  if (raw) return res; // appelant veut gérer lui-même (upload, etc.)

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, messageForStatus(res.status, data.message), data.code);
  }

  return data;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) => request(path, { ...options, method: "POST", body }),
  put: (path, body, options) => request(path, { ...options, method: "PUT", body }),
  del: (path, options) => request(path, { ...options, method: "DELETE" })
};
