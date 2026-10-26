"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/useAuth";

/**
 * Garde d'accès (équivalent de l'ancien ProtectedRoute allowedRoles=['user','admin']).
 * Phase 3b : la session est confirmée par /auth/me (cookie httpOnly) — le
 * middleware.js a déjà vérifié la signature JWT côté serveur ; ce layout reste
 * le garde de confort côté client.
 * - Non connecté → redirection /login (avec `from` pour revenir après connexion)
 * - Rôle inconnu (ni user ni admin) → redirection /home
 * - Erreur réseau (reason "network") → on laisse afficher (repli hors-ligne,
 *   comportement historique : le backend reste l'autorité sur les données)
 */
export default function ProtectedLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, reason, role } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user && reason !== "network") {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user && !["user", "admin"].includes(String(role).toLowerCase())) {
      router.replace("/home");
      return;
    }
    setReady(true);
  }, [loading, user, reason, role, router, pathname]);

  if (!ready) return null;

  return <>{children}</>;
}
