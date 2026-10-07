import { createContext, useContext } from "react";

/**
 * Contexte d'authentification (partagé, sans composant → compatible Fast Refresh).
 * Le composant AuthProvider vit dans AuthContext.jsx.
 */
export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}
