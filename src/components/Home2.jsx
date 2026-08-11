import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Sparkles, 
  LayoutTemplate, 
  Heart, 
  LogOut, 
  Mail, 
  ArrowRight,
  User,
  CreditCard,
  PlusCircle,
  DownloadCloud,
  CheckCircle2,
  ChevronDown,
  Bell,
  MessageSquare
} from 'lucide-react';

function Home2() {
  const navigate = useNavigate();
  
  // États synchronisés avec l'API en direct
  const [userName, setUserName] = useState(''); // Contient le nom de l'utilisateur
  const [userPlan, setUserPlan] = useState('Gratuit');
  const [allowedLimit, setAllowedLimit] = useState(5);
  const [downloadCount, setDownloadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Gestion du menu déroulant (Dropdown profil)
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // --- RECUPERATION DU STATUT EN TEMPS REEL ---
  useEffect(() => {
    let isMounted = true;

    const fetchUserProfile = async () => {
      const token = localStorage.getItem("token");
      
      if (!token) {
        console.log("Aucun token trouvé, redirection...");
        navigate("/");
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        if (response.ok && isMounted) {
          const userData = await response.json();
          
          // Récupération et sauvegarde des données de l'utilisateur
          setUserName(userData.name || ''); 
          setUserPlan(userData.user_plan || 'Gratuit');
          setAllowedLimit(userData.user_max_downloads || 5);
          
          localStorage.setItem('user_plan', userData.user_plan || 'Gratuit');
          localStorage.setItem('user_max_downloads', userData.user_max_downloads || 5);
        } else if ((response.status === 401 || response.status === 403) && isMounted) {
          handleLogout();
        }
      } catch (error) {
        console.error("Erreur réseau lors du fetch /me :", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const savedCount = localStorage.getItem('download_count');
    setDownloadCount(savedCount ? parseInt(savedCount, 10) : 0);

    fetchUserProfile();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // Fermer le menu déroulant si on clique en dehors
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/"; 
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans flex flex-col antialiased">
      
      {/* --- BANDEAU DE NAVIGATION SOMBRE & INTERACTIF --- */}
      <nav className="w-full border-b border-slate-800/80 bg-[#0f172a]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="flex justify-between items-center px-4 sm:px-6 py-4 max-w-7xl mx-auto gap-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-600/20">
              <FileText size={20} />
            </div>
            <span className="text-base sm:text-lg font-black tracking-tighter uppercase bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              CV.<span className="text-blue-500">Craft</span>
            </span>
          </Link>

          {/* Profil et Actions Droite */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Raccourci vers les Modèles */}
            <Link 
              to="/Models" 
              className="hidden sm:flex items-center gap-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white transition-all"
            >
              <LayoutTemplate size={14} className="text-blue-500" />
              <span>Modèles</span>
            </Link>

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
                      {allowedLimit - downloadCount} <span className="text-slate-500 font-normal">/ {allowedLimit} restants</span>
                    </span>
                  </div>

                  {/* Liens du Menu */}
                  <div className="py-1.5">
                    <Link 
                      to="/Models" 
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
                    >
                      <LayoutTemplate size={15} className="text-slate-500" />
                      <span>Parcourir les modèles</span>
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

          </div>
        </div>
      </nav>

      {/* --- TABLEAU DE BORD UTILISATEUR --- */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 lg:py-20 flex-grow">
        
        <div className="bg-gradient-to-r from-slate-900 via-[#1e293b]/40 to-slate-900 border border-slate-800/80 rounded-2xl sm:rounded-3xl p-6 md:p-8 mb-12 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-400 font-medium text-sm">
              <User size={16} />
              <span>Espace Membre</span>
            </div>
            {/* Ligne d'accueil modifiée ici */}
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Ravi de vous revoir sur CV.Craft{userName ? `, ${userName}` : ''} ! 👋
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              Prêt à propulser votre carrière ? Créez un nouveau modèle ou mettez à jour vos données actuelles en quelques clics.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <Link 
              to="/Create"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm px-5 py-3 rounded-xl transition-all shadow-lg shadow-blue-600/10 w-full sm:w-auto"
            >
              <PlusCircle size={18} />
              Créer / Éditer mon CV
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          
          {/* Widget 1 : Statut du Plan */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700/80 transition-all shadow-md group">
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 w-fit rounded-xl">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-200">Abonnement Actuel</h3>
                <p className="text-slate-400 text-xs mt-1">Géré en temps réel selon vos options de facturation.</p>
              </div>
              <div className="pt-2">
                <span className="text-2xl font-extrabold text-amber-400 tracking-tight">{userPlan}</span>
              </div>
            </div>
            <Link 
              to="/Plans" 
              className="text-xs font-bold text-blue-400 group-hover:text-blue-300 flex items-center gap-1 mt-6 transition-colors"
            >
              Gérer ou modifier mon offre <ArrowRight size={12} />
            </Link>
          </div>

          {/* Widget 2 : Quota de téléchargements DYNAMIQUE */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700/80 transition-all shadow-md group">
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 w-fit rounded-xl">
                <DownloadCloud size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-200">Téléchargements PDF</h3>
                <p className="text-slate-400 text-xs mt-1">Utilisation basée sur les limites de votre offre.</p>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500" 
                  style={{ width: `${Math.min((downloadCount / allowedLimit) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <span className="text-xs font-medium text-slate-400 mt-6">
              Compteur : <strong className="text-slate-200">{downloadCount} / {allowedLimit}</strong> téléchargements
            </span>
          </div>

          {/* Widget 3 : Avantage & Conseils */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700/80 transition-all shadow-md group">
            <div className="space-y-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 w-fit rounded-xl">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-200">Analyse de CV par IA</h3>
                <p className="text-slate-400 text-xs mt-1">Gagnez du temps en injectant directement votre ancien PDF.</p>
              </div>
              <ul className="text-xs text-slate-400 space-y-1.5 pt-1">
                <li className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 size={12} className="text-blue-500" /> Remplissage automatique
                </li>
                <li className="flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2 size={12} className="text-blue-500" /> Structure de données propre
                </li>
              </ul>
            </div>
            <Link 
              to="/Create" 
              className="text-xs font-bold text-purple-400 group-hover:text-purple-300 flex items-center gap-1 mt-4 transition-colors"
            >
              Tester l'importation IA <ArrowRight size={12} />
            </Link>
          </div>

        </div>

        {/* --- SECTION DES FONCTIONNALITÉS --- */}
        <section className="border-t border-slate-800/60 pt-16">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <h2 className="text-2xl md:text-3xl font-extrabold">Pourquoi concevoir avec CV.Craft ?</h2>
            <p className="text-slate-400 text-sm">
              Tout est pensé pour optimiser l'impact visuel et la lisibilité auprès des systèmes ATS des recruteurs.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<LayoutTemplate className="text-blue-500" />}
              title="Design Professionnel"
              desc="Des gabarits graphiques validés et plébiscités par des experts RH."
            />
            <FeatureCard 
              icon={<Sparkles className="text-purple-500" />}
              title="Export Vectoriel Instantané"
              desc="Générez et téléchargez votre CV en PDF haute qualité A4 d'un seul clic."
            />
            <FeatureCard 
              icon={<FileText className="text-emerald-500" />}
              title="Éditeur Fluide"
              desc="Ajoutez, masquez ou modifiez des sections sur mobile comme sur ordinateur."
            />
          </div>
        </section>
      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-[#0b0f19] border-t border-slate-900 pt-16 pb-8 text-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-lg">
                  <FileText size={18} />
                </div>
                <span className="text-lg font-bold tracking-tight">CV.Craft</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                La plateforme ultime et intelligente pour structurer et créer des CV professionnels percutants.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-5 text-xs uppercase tracking-widest text-slate-300">Produit</h4>
              <ul className="space-y-3 text-slate-400 text-xs">
                <li><Link to="/Create" className="hover:text-white transition-colors">Créateur de CV</Link></li>
                <li><Link to="/Models" className="hover:text-white transition-colors">Modèles de CV</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-5 text-xs uppercase tracking-widest text-slate-300">Aide</h4>
              <ul className="space-y-3 text-slate-400 text-xs">
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="mailto:ogouogoudavid@gmail.com" className="hover:text-white transition-colors">Support technique</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-5 text-xs uppercase tracking-widest text-slate-300">Contact</h4>
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Mail size={14} className="text-slate-500" />
                <span>ogouogoudavid@gmail.com</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-xs">© 2026 CV.Craft. Tous droits réservés.</p>
            <p className="text-slate-500 text-xs flex items-center gap-1">
              Fait avec <Heart size={12} className="text-red-500 fill-red-500" /> par Informatics
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const FeatureCard = ({ icon, title, desc }) => (
  <div className="space-y-3 bg-slate-900/40 border border-slate-800/60 p-5 rounded-2xl hover:border-slate-800 transition-colors">
    <div className="bg-slate-800/80 w-11 h-11 rounded-xl flex items-center justify-center border border-slate-700/30">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-slate-200">{title}</h3>
    <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
  </div>
);

export default Home2;