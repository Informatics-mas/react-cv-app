"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/useAuth";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  LayoutTemplate,
  Mail,
  LogOut,
} from "lucide-react";

/**
 * Barre de navigation de l'espace admin (module restauré — migration Next.js).
 *
 * - Routage : `next/link` + `usePathname` (aucun react-router-dom) ;
 * - Déconnexion : `logout()` du contexte (révocation serveur confirmée —
 *   cookie httpOnly + jti — puis purge des seules clés d'auth via
 *   `clearAuthStorage()` : le CV local `cv_data_pro` est préservé), puis
 *   redirection vers la landing page `/`.
 * - Le contrôle de rôle côté client est un CONFORT : l'autorité reste le
 *   backend (chaque endpoint admin = protect + adminOnly).
 * - Thème conservé : fond `#0b1120`, texte clair, bordures slate.
 * - Responsive : sticky seulement en desktop (md+) et SANS h-screen —
 *   100vh sous la barre supérieure forçait un double scroll.
 */
function NavItem({ href, icon, label, active = false }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all group ${
        active
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
          : "hover:bg-slate-800/50 hover:text-white text-slate-500"
      }`}
    >
      <span
        className={`${active ? "text-white" : "text-slate-600 group-hover:text-blue-400"} transition-colors`}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { logout } = useAuth();

  const handleLogout = async () => {
    // Déconnexion COMPLÈTE : la révocation serveur (cookie httpOnly + jti)
    // est confirmée par logout() avant de vider l'état ; en cas d'échec on
    // ne prétend pas — la session reste affichée. Succès → landing publique.
    const ok = await logout();
    if (ok) {
      router.replace("/");
    }
  };

  return (
    <nav
      aria-label="Navigation administration"
      className="w-full md:w-72 text-slate-300 border-r border-slate-800/60 bg-[#0b1120] flex flex-col md:sticky md:top-0"
    >
      {/* LOGO / TITRE */}
      <div className="p-6">
        <div className="flex items-center gap-3 group">
          <div>
            <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">
              Admin Panel
            </span>
          </div>
        </div>
      </div>

      {/* MENU PRINCIPAL */}
      <div className="flex-1 px-4 space-y-2 mt-4">
        <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[2px] mb-4">
          Menu
        </p>

        <NavItem
          href="/admin"
          icon={<LayoutDashboard size={18} />}
          label="Vue d'ensemble"
          active={pathname === "/admin"}
        />

        <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[2px] mb-4 mt-8">
          Gestion
        </p>

        <NavItem
          href="/admin/users"
          icon={<Users size={18} />}
          label="Utilisateurs"
          active={pathname === "/admin/users"}
        />
        <NavItem
          href="/admin/subscriptions"
          icon={<Sparkles size={18} />}
          label="Abonnements"
          active={pathname === "/admin/subscriptions"}
        />
        <NavItem
          href="/admin/plans"
          icon={<LayoutTemplate size={18} />}
          label="Plans et tarifs"
          active={pathname === "/admin/plans"}
        />

        <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[2px] mb-4 mt-8">
          Communication
        </p>

        <NavItem
          href="/admin/mailer"
          icon={<Mail size={18} />}
          label="Email marketing"
          active={pathname === "/admin/mailer"}
        />
      </div>

      {/* DÉCONNEXION */}
      <div className="p-4 mt-auto border-t border-slate-800/60">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all group text-left"
        >
          <div className="p-2 rounded-lg bg-slate-800 group-hover:bg-red-500/20 text-slate-400 group-hover:text-red-400">
            <LogOut size={18} />
          </div>
          <span className="font-bold text-sm">Déconnexion</span>
        </button>
      </div>
    </nav>
  );
}
