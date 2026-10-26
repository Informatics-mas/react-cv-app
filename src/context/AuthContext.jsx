"use client";

import { useEffect, useState, useCallback } from "react";
import { API_BASE_URL } from "../api/client";
import { clearAuthStorage } from "../utils/authStorage.js";
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
  // Token et repli de rôle hydratés APRÈS le montage côté navigateur :
  // aucun accès à localStorage pendant le rendu serveur (SSR/hydration sûrs).
  const [token, setToken] = useState(null);
  const [roleFallback, setRoleFallback] = useState(null);

  const isAuthenticated = Boolean(user);
  // Rôle = valeur servie par /auth/me ; le repli localStorage n'est qu'un cache
  // d'affichage (l'autorité reste le backend : protect/adminOnly).
  const role = user?.role || roleFallback;

  const refresh = useCallback(async () => {
    // Session = cookie httpOnly (contrat backend Phase 3b) : l'appel est
    // TOUJOURS tenté avec credentials — un ancien token localStorage n'est
    // jamais une preuve de session (règle d'architecture auth).
    setLoading(true);
    setReason(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: "include"
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

  // Déconnexion COMPLÈTE : la révocation serveur (cookie httpOnly + jti)
  // est confirmée AVANT de vider l'état frontend. Si le backend n'a pas
  // révoqué (erreur HTTP/réseau), on ne prétend PAS que la déconnexion est
  // réussie : la session pourrait encore être valide → retour false.
  const logout = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
      if (!res.ok) return false;
    } catch {
      return false; // réseau : on ne ment pas sur l'invalidation
    }
    setUser(null);
    setToken(null);
    setRoleFallback(null);
    setReason(null);
    clearAuthStorage(); // purge des SEULES clés d'auth (cv_data_pro préservé)
    return true;
  }, []);

  useEffect(() => {
    // Hydratation navigateur après le montage (jamais pendant le rendu serveur).
    setRoleFallback(localStorage.getItem("userRole")?.toLowerCase() || null);
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
    refresh,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
