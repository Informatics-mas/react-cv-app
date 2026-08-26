import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  FileText, 
  ArrowRight,
  User,
  LogOut,
  DownloadCloud,
  ChevronDown,
  LayoutTemplate,
  CreditCard
} from 'lucide-react';

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Vérification de l'état de connexion[cite: 3, 4]
  const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
  const isAuthenticated = !!token;

  // États pour l'utilisateur connecté[cite: 2, 4]
  const [userName, setUserName] = useState('');
  const [userPlan, setUserPlan] = useState(() => localStorage.getItem('user_plan') || 'Gratuit');
  const [allowedLimit, setAllowedLimit] = useState(() => parseInt(localStorage.getItem('user_max_downloads') || '5', 10));
  const [downloadCount, setDownloadCount] = useState(() => parseInt(localStorage.getItem('download_count') || '0', 10));

  // Gestion du menu déroulant[cite: 2, 3, 4]
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Déterminer le lien de retour vers le dashboard[cite: 3, 4]
  const getDashboardPath = () => {
    if (localStorage.getItem('token')) return '/Home';
    if (localStorage.getItem('adminToken')) return '/UserHome';
    return '/';
  };

  // Récupération des données utilisateur si connecté[cite: 2, 4]
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchUserProfile = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUserName(userData.name || ''); 
          setUserPlan(userData.user_plan || 'Gratuit');
          setAllowedLimit(userData.user_max_downloads || 5);
          
          localStorage.setItem('user_plan', userData.user_plan || 'Gratuit');
          localStorage.setItem('user_max_downloads', userData.user_max_downloads || 5);
        }
      } catch (error) {
        console.error("Erreur réseau lors du fetch /me :", error);
      }
    };

    fetchUserProfile();
  }, [isAuthenticated, token]);

  // Fermeture du dropdown au clic à l'extérieur[cite: 2, 3, 4]
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Déconnexion avec nettoyage complet[cite: 3, 5]
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("cv_data_pro");
    window.location.href = "/"; 
  };

  return (
    <nav className="w-full border-b border-slate-800/80 bg-[#0f172a] backdrop-blur-md sticky top-0 z-50">
      <div className="flex justify-between items-center px-4 sm:px-6 py-4 max-w-7xl mx-auto gap-4">
        
        {/* Logo (commun à tous les états) */}
        <div className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-600/20">
            <FileText size={20} />
          </div>
          <span className="text-base sm:text-lg font-black tracking-tighter uppercase bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            CV.<span className="text-blue-500">Craft</span>
          </span>
        </div>

        {/* Section Droite */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* VISITEUR NON CONNECTÉ[cite: 1] */}
          {!isAuthenticated ? (
            <>
              <Link 
                to="/Models" 
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-full font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5"
              >
                Modèles <ArrowRight size={14} />
              </Link>
              <Link 
                to="/login" 
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-full font-bold text-xs sm:text-sm transition-all shadow-lg shadow-blue-600/20"
              >
                Login
              </Link>
            </>
          ) : (
            /* UTILISATEUR CONNECTÉ[cite: 2, 3, 4] */
            <>
              {/* Raccourci vers les Modèles (masqué sur mobile) */}
              {location.pathname !== '/Models' && (
                <Link 
                  to="/Models" 
                  className="hidden sm:flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-all"
                >
                  <LayoutTemplate size={14} className="text-blue-500" />
                  <span>Modèles</span>
                </Link>
              )}

              {/* Menu Déroulant Profil */}
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1 focus:outline-none group text-slate-300 hover:text-white p-1 rounded-xl transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:border-blue-500 group-hover:text-white transition-all">
                    <User size={16} className="stroke-[2.5]" />
                  </div>
                  <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Contenu du Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-[#1e293b] border border-slate-700/80 rounded-2xl shadow-2xl py-2 z-50 text-slate-200 animate-in fade-in slide-in-from-top-2 duration-150">
                    
                    {/* Offre en-tête */}
                    <div className="px-4 py-3 border-b border-slate-700/60 bg-slate-900/40 rounded-t-2xl">
                      <p className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Mon offre</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs font-bold text-slate-300">Formule actuelle</span>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          userPlan.toLowerCase() === 'gratuit' || userPlan.toLowerCase() === 'free' 
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {userPlan}
                        </span>
                      </div>
                    </div>

                    {/* Quotas restants */}
                    <div className="px-4 py-3 border-b border-slate-700/60 text-xs text-slate-400 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <DownloadCloud size={14} className="text-blue-400" />
                        <span>Téléchargements</span>
                      </div>
                      <span className="font-bold text-white">
                        {allowedLimit - downloadCount} <span className="text-slate-500 font-normal">/ {allowedLimit}</span>
                      </span>
                    </div>

                    {/* Liens du Menu */}
                    <div className="py-1.5">
                      <Link 
                        to={getDashboardPath()} 
                        onClick={() => setDropdownOpen(false)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
                      >
                        <User size={15} className="text-slate-500" />
                        <span>Mon Espace {userName ? `(${userName})` : ''}</span>
                      </Link>
                      
                      <Link 
                        to="/Plans" 
                        onClick={() => setDropdownOpen(false)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
                      >
                        <CreditCard size={15} className="text-slate-500" />
                        <span>Changer de formule</span>
                      </Link>
                    </div>

                    {/* Bouton de Déconnexion */}
                    <div className="border-t border-slate-700/60 pt-1.5 mt-1">
                      <button 
                        onClick={() => { setDropdownOpen(false); handleLogout(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 font-medium transition-colors text-left"
                      >
                        <LogOut size={15} />
                        <span>Déconnexion</span>
                      </button>
                    </div>

                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </nav>
  );
}

export default Navbar;