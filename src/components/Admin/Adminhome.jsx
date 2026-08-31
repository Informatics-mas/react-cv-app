import React from 'react';
import { useState, useEffect } from "react";
import { Link, Routes, Route, useLocation } from 'react-router-dom';
import { FaUser } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { 
  FileText, 
  Sparkles, 
  LayoutTemplate, 
  Heart,
  User, 
  Mail,
  ArrowRight,
  LayoutDashboard
} from 'lucide-react';
import SubscriptionManager from './subscriptions';
import UserManager from './usermanager';
import AdminPlans from './AdminPlans';

function Adminhome() {
  const navigate = useNavigate();
  const location = useLocation();

  const [stats, setStats] = useState({ users: 0, subs: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${import.meta.env.VITE_API_URL}/stats/dashboard-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 401) {
         localStorage.removeItem("token");
         localStorage.removeItem("userRole");
         window.location.href = "/login";
         return;
       }

        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Erreur stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userRole"); 
    
    navigate("/login", { replace: true });
    
    window.location.reload();
  };

  const [recentUsers, setRecentUsers] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
       const res = await fetch(`${import.meta.env.VITE_API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 401) {
         localStorage.removeItem("token");
         localStorage.removeItem("userRole");
         window.location.href = "/login";
         return;
       }
      
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setRecentUsers(data.slice(0, 4));
        } else {
          console.error("Le serveur n'a pas renvoyé un tableau :", data);
          setRecentUsers([]);
        }
      } catch (err) {
        console.error("Erreur chargement utilisateurs récents:", err);
        setRecentUsers([]);
      }
    };
    fetchDashboardData();
  }, []);
  

  return (
    <div className="min-h-screen bg-[#131b2e] text-white font-sans flex">
      {/* --- SIDEBAR NAV --- */}
      <nav className="w-full md:w-72 text-slate-300 border-r border-slate-800/60 bg-[#0b1120] flex flex-col h-screen sticky top-0">
        
        {/* LOGO SECTION */}
        <div className="p-6">
          <div className="flex items-center gap-3 group">
            <div>
              <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Admin Panel</span>
            </div>
          </div>
        </div>

        {/* MENU PRINCIPAL */}
        <div className="flex-1 px-4 space-y-2 mt-4">
          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[2px] mb-4">Menu</p>
          
          <NavItem 
            to="/admin" 
            icon={<LayoutDashboard size={18} />} 
            label="Vue d'ensemble" 
            active={location.pathname === "/admin"} 
          />

          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[2px] mb-4 mt-8">Gestion</p>
          
          <NavItem 
            to="/admin/users" 
            icon={<FaUser size={18} />} 
            label="Utilisateurs" 
            active={location.pathname === "/admin/users"} 
          />
          <NavItem 
            to="/admin/subscriptions" 
            icon={<Sparkles size={18} />} 
            label="Abonnements" 
            active={location.pathname === "/admin/subscriptions"} 
          />
          <NavItem 
            to="/admin/AdminPlans" 
            icon={<LayoutTemplate size={18} />} 
            label="Plans & Tarifs" 
            active={location.pathname === "/admin/AdminPlans"} 
          />

          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-[2px] mb-4 mt-8">Communication</p>
          
          <NavItem 
            to="/admin/mailer" 
            icon={<Mail size={18} />} 
            label="Email Marketing" 
            active={location.pathname === "/admin/mailer"} 
          />
        </div>

        {/* FOOTER / LOGOUT */}
        <div className="p-4 mt-auto border-t border-slate-800/60">
          <button 
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

      {/* --- CONTENU PRINCIPAL --- */}
      <main className="flex-1 p-8 overflow-y-auto bg-[#131b2e]">
        <Routes>
          {/* Dashboard Stats */}
          <Route path="/" element={
            <>
              <div className="flex justify-between items-center mb-10">
                <div>
                    <h2 className="text-3xl font-bold">Tableau de bord</h2>
                    <p className="text-slate-400 text-sm">Bienvenue dans votre espace de gestion.</p>
                </div>
                <div className="text-xs font-mono text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
                    SESSIONS_LIVE: 42
                </div>
              </div>

              {/* GRILLE DE STATISTIQUES */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <StatCard 
                  title="Utilisateurs" 
                  value={loading ? "..." : (stats?.users || 0).toLocaleString()} 
                  icon={<User size={20} />} 
                  trend="Total en base" 
                />
                <StatCard 
                  title="Abonnements Actifs" 
                  value={loading ? "..." : (stats?.subs || 0).toLocaleString()} 
                  icon={<Sparkles size={20} />} 
                  trend="Mise à jour réelle" 
                />
               <StatCard 
                  title="Revenus Mensuels" 
                  value={loading ? "..." : `${(stats?.revenue || 0).toLocaleString()} XOF`} 
                  icon={<Heart size={20} />} 
                  trend="+8% cette semaine" 
                />
              </div>

              {/* DERNIÈRES ACTIVITÉS */}
              <div className="bg-[#0b1120]/50 rounded-2xl border border-slate-800 p-6 backdrop-blur-sm">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  Dernières Inscriptions
                </h3>
                <div className="space-y-3">
                  {recentUsers.length > 0 ? (
                    recentUsers.map((user) => (
                      <div key={user._id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 hover:border-blue-500/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold shadow-lg text-white">
                            {/* Affiche la première lettre du nom en majuscule */}
                            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-white">{user.name || "Utilisateur sans nom"}</p>
                            <p className="text-xs text-slate-500 italic">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        <Link to="/admin/users" className="text-blue-400 hover:text-white text-xs font-bold px-4 py-2 bg-blue-500/10 rounded-lg transition-colors">
                          Gérer
                        </Link>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm italic text-center py-4">Aucune inscription récente</p>
                  )}
                </div>
              </div>
            </>
          } />

          {/* Sous-pages */}
          <Route path="/users" element={<UserManager />} />
          <Route path="/subscriptions" element={<SubscriptionManager />} />
          <Route path="/AdminPlans" element={<AdminPlans/>} />
          <Route path="/mailer" element={<Placeholder title="Email Marketing" />} />
        </Routes>
      </main>
    </div>
  );
}

/* --- COMPOSANTS INTERNES --- */

const StatCard = ({ title, value, icon, trend }) => (
  <div className="bg-[#0b1120]/50 p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl backdrop-blur-sm hover:border-slate-700 transition-colors">
    <div className="flex justify-between items-center">
      <div className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-lg text-blue-400">{icon}</div>
      <span className="text-[10px] text-emerald-400 font-bold uppercase bg-emerald-400/10 px-2 py-1 rounded-full">{trend}</span>
    </div>
    <div>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-black text-white mt-1 tracking-tight">{value}</h3>
    </div>
  </div>
);

const NavItem = ({ to, icon, label, active = false }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all group ${
      active 
        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
        : "hover:bg-slate-800/50 hover:text-white text-slate-500"
    }`}
  >
    <span className={`${active ? "text-white" : "text-slate-600 group-hover:text-blue-400"} transition-colors`}>
      {icon}
    </span>
    {label}
  </Link>
);

const Placeholder = ({ title }) => (
    <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">
        <div className="bg-slate-800 p-4 rounded-full mb-4">
            <LayoutTemplate size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-300">{title}</h2>
        <p className="text-sm italic">Ce module est en cours de développement...</p>
    </div>
);

export default Adminhome;