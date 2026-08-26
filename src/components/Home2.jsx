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
        const response = await fetch(`${import.meta.env.API_URL}/auth/me`, {
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
      <div className="min-h-screen bg-[#0f172a] text-white font-sans flex flex-col antialiased">
        <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 lg:py-20 flex-grow animate-pulse">
          
          {/* Skeleton : Bandeau de bienvenue (Haut) */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl sm:rounded-3xl p-6 md:p-8 mb-12 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-4 w-full md:w-2/3">
              {/* Badge "Espace Membre" */}
              <div className="h-5 w-32 bg-slate-800 rounded-md"></div>
              {/* Grand Titre */}
              <div className="h-8 md:h-10 w-3/4 bg-slate-800 rounded-xl"></div>
              {/* Paragraphe de description */}
              <div className="space-y-2">
                <div className="h-4 w-full max-w-xl bg-slate-800 rounded-md"></div>
                <div className="h-4 w-2/3 max-w-xl bg-slate-800 rounded-md"></div>
              </div>
            </div>
            {/* Bouton Créer CV */}
            <div className="w-full md:w-auto">
              <div className="h-12 w-full md:w-48 bg-slate-800 rounded-xl"></div>
            </div>
          </div>

          {/* Skeleton : Les 3 Widgets (Plan, Quota, IA) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between h-56">
                <div className="space-y-4">
                  {/* Icone */}
                  <div className="w-12 h-12 bg-slate-800 rounded-xl"></div>
                  {/* Titre et sous-titre */}
                  <div>
                    <div className="h-5 w-2/3 bg-slate-800 rounded-md mb-2"></div>
                    <div className="h-3 w-full bg-slate-800 rounded-md"></div>
                  </div>
                  {/* Valeur ou Barre de progression */}
                  <div className="h-8 w-1/2 bg-slate-800 rounded-lg mt-4"></div>
                </div>
                {/* Lien du bas */}
                <div className="h-3 w-1/3 bg-slate-800 rounded-md mt-6"></div>
              </div>
            ))}
          </div>

          {/* Skeleton : Section Fonctionnalités (Bas) */}
          <div className="border-t border-slate-800/60 pt-16">
            <div className="flex flex-col items-center mb-12 space-y-4">
              <div className="h-8 w-64 bg-slate-800 rounded-xl"></div>
              <div className="h-4 w-96 max-w-full bg-slate-800 rounded-md"></div>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[1, 2, 3].map((item) => (
                <div key={item} className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-2xl space-y-4">
                  <div className="w-11 h-11 bg-slate-800 rounded-xl"></div>
                  <div className="h-5 w-2/3 bg-slate-800 rounded-md"></div>
                  <div className="h-3 w-full bg-slate-800 rounded-md"></div>
                  <div className="h-3 w-4/5 bg-slate-800 rounded-md"></div>
                </div>
              ))}
            </div>
          </div>

        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans flex flex-col antialiased">
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