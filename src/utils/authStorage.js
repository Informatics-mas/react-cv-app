/**
 * Clés de session (authentification) stockées dans le localStorage.
 *
 * Utilisées pour une déconnexion propre qui préserve les données locales
 * du CV en cours (cv_data_pro) : ne JAMAIS utiliser localStorage.clear()
 * pour se déconnecter.
 */
export const AUTH_STORAGE_KEYS = [
  "token",
  "adminToken",
  "userRole",
  "user_plan",
  "user_max_downloads",
  "download_count"
];

/** Purge uniquement les données d'authentification (déconnexion). */
export function clearAuthStorage() {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}