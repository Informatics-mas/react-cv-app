"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Sparkles, Heart, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "../../api/client";
import { clearAuthStorage } from "../../utils/authStorage";

/**
 * Tableau de bord administrateur (module restauré — migration Next.js).
 *
 * Sources de données (endpoints RÉELS du backend, protect + adminOnly) :
 * - GET  /stats/dashboard-stats → { users, subs, revenue }
 * - GET  /users                → { data: [...] } (liste paginée)
 * Aucune statistique inventée : cartes affichées à partir des valeurs réelles.
 * Contrôle de rôle côté client = confort ; l'autorité reste le backend.
 */

/** Carte de statistique (thème historique du tableau de bord). */
function StatCard({ title, value, icon, trend }) {
  return (
    <div className="bg-[#0b1120]/50 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl backdrop-blur-sm hover:border-slate-700 transition-colors">
      <div className="flex justify-between items-center">
        <div className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-lg text-blue-400">
          {icon}
        </div>
        <span className="text-[10px] text-emerald-400 font-bold uppercase bg-emerald-400/10 px-2 py-1 rounded-full">
          {trend}
        </span>
      </div>
      <div>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black text-white mt-1 tracking-tight">{value}</h3>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const authHeaders = () => {
    const token =
      (typeof window !== "undefined" &&
        (localStorage.getItem("token") || localStorage.getItem("adminToken"))) ||
      null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    let cancelled = false;

    const failAuth = () => {
      clearAuthStorage();
      router.replace("/login");
    };

    const num = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // --- Statistiques (endpoints réels uniquement) ---
        const resStats = await fetch(`${API_BASE_URL}/stats/dashboard-stats`, {
          credentials: "include",
          headers: authHeaders(),
        });
        if (resStats.status === 401 || resStats.status === 403) return failAuth();
        const bodyStats = resStats.ok ? await resStats.json() : null;
        if (!cancelled && resStats.ok && bodyStats && typeof bodyStats === "object") {
          setStats({
            users: num(bodyStats.users),
            subs: num(bodyStats.subs),
            revenue: num(bodyStats.revenue),
          });
        } else if (!cancelled && !resStats.ok) {
          setError("Impossible de charger les statistiques du tableau de bord. Réessayez plus tard.");
        }

        // --- Dernières inscriptions (réponse réelle de GET /users) ---
        const resUsers = await fetch(`${API_BASE_URL}/users`, { credentials: "include", headers: authHeaders() });
        if (resUsers.status === 401 || resUsers.status === 403) return failAuth();
        const bodyUsers = resUsers.ok ? await resUsers.json() : null;
        const list = Array.isArray(bodyUsers)
          ? bodyUsers
          : Array.isArray(bodyUsers?.data)
            ? bodyUsers.data
            : null;
        if (!cancelled && list) {
          setRecentUsers(list.slice(0, 4));
        } else if (!cancelled && !resUsers.ok) {
          setError("Impossible de charger les derniers utilisateurs.");
        }
      } catch {
        if (!cancelled) {
          setError("Connexion au serveur impossible. Réessayez plus tard.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-full">
      {error && (
        <div className="mb-6 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-bold">Tableau de bord</h2>
          <p className="text-slate-400 text-sm">Bienvenue dans votre espace de gestion.</p>
        </div>
      </div>

      {/* GRILLE DE STATISTIQUES (valeurs réelles uniquement) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard
          title="Utilisateurs"
          value={loading ? "..." : (stats?.users ?? 0).toLocaleString()}
          icon={<User size={20} />}
          trend="Total en base"
        />
        <StatCard
          title="Abonnements Actifs"
          value={loading ? "..." : (stats?.subs ?? 0).toLocaleString()}
          icon={<Sparkles size={20} />}
          trend="Mise à jour réelle"
        />
        <StatCard
          title="Revenus Mensuels"
          value={loading ? "..." : `${(stats?.revenue ?? 0).toLocaleString()} XOF`}
          icon={<Heart size={20} />}
          trend="Aucun paiement enregistré"
        />
      </div>

      {/* DERNIÈRES INSCRIPTIONS */}
      <div className="bg-[#0b1120]/50 rounded-2xl border border-slate-800 p-6 backdrop-blur-sm">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          Dernières Inscriptions
        </h3>
        <div className="space-y-3">
          {loading ? (
            <p className="text-slate-500 text-sm italic text-center py-4">Chargement…</p>
          ) : recentUsers.length > 0 ? (
            recentUsers.map((u) => (
              <div
                key={u?._id ?? u?.id ?? u?.email}
                className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 hover:border-blue-500/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold shadow-lg text-white">
                    {u?.name ? u.name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white">
                      {u?.name || "Utilisateur sans nom"}
                    </p>
                    <p className="text-xs text-slate-500 italic">{u?.email || "—"}</p>
                  </div>
                </div>
                <Link
                  href="/admin/users"
                  className="text-blue-400 hover:text-white text-xs font-bold px-4 py-2 bg-blue-500/10 rounded-lg transition-colors"
                >
                  Gérer
                </Link>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-sm italic text-center py-4">
              Aucune inscription récente
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
