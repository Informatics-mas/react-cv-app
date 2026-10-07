import { useEffect, useState, useCallback } from "react";
import { API_BASE_URL } from "../api/client";
import { AuthContext } from "./useAuth";

/**
 * État utilisateur central (source : GET /auth/me du backend).
 * - un SEUL appel /auth/me partagé par Navbar, Home2, Plans ;
 * - role/plan/quota proviennent du serveur, jamais du localStorage ;
 * - le localStorage ne sert plus que de cache d'affichage avant le premier rendu.
 * (Le contexte lui-même est créé dans useAuth.js — export séparé pour Fast Refresh.)
 */

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // null | "unauthorized" (401/403) | "network" — permet au consommateur de distinguer
  // une session invalide (déconnexion) d'une coupure réseau (simple repli d'affichage)
  const [reason, setReason] = useState(null);
  const [token, setToken] = useState(
    () => localStorage.getItem("token") || localStorage.getItem("adminToken")
  );

  const isAuthenticated = Boolean(token);
  // Rôle = valeur servie par /auth/me ; le localStorage n'est qu'un repli d'affichage
  // (l'autorité reste le backend : protect/adminOnly).
  const role = user?.role || localStorage.getItem("userRole")?.toLowerCase() || null;

  const refresh = useCallback(async () => {
    const currentToken = localStorage.getItem("token") || localStorage.getItem("adminToken");
    setToken(currentToken);

    if (!currentToken) {
      setUser(null);
      setReason(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setReason(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      if (res.ok) {
        const body = await res.json();
        setUser(body);
        // Cache d'affichage cohérent avec la valeur serveur
        localStorage.setItem("user_plan", body.user_plan || "Free");
        localStorage.setItem("user_max_downloads", String(body.user_max_downloads || 5));
      } else {
        setUser(null);
        setReason(res.status === 401 || res.status === 403 ? "unauthorized" : "error");
      }
    } catch {
      setUser(null); // réseau : les écrans afficheront leurs valeurs de repli
      setReason("network");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => { await refresh(); };
    run();
  }, [refresh]);

  const value = {
    user,
    loading,
    reason,
    token,
    isAuthenticated,
    role,
    plan: user?.user_plan ?? null,
    subscription: user?.subscription ?? null,
    refresh
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
