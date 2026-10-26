"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import AdminSidebar from "@/components/Admin/AdminSidebar";
import { useAuth } from "@/context/useAuth";

/**
 * Garde d'accès admin (équivalent de l'ancien ProtectedRoute allowedRoles=['admin']).
 * Phase 3b : middleware.js vérifie la signature JWT ; ce layout contrôle le
 * rôle côté client pour le confort. Le BACKEND reste l'autorité finale :
 * chaque endpoint admin est couvert par protect + adminOnly (403 sinon).
 * - Non connecté → redirection /login
 * - Rôle ≠ admin → redirection /home
 * La sidebar vit dans ce layout ; les pages imbriquées sont rendues dans <main>.
 */
export default function AdminLayout({ children }) {
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
    if (user && String(role).toLowerCase() !== "admin") {
      router.replace("/home");
      return;
    }
    setReady(true);
  }, [loading, user, reason, role, router, pathname]);

  if (!ready) return null;

  return (
    <div className="min-h-full bg-[#131b2e] text-white font-sans flex">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-y-auto bg-[#131b2e]">{children}</main>
    </div>
  );
}
