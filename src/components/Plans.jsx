import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  ArrowLeft,
  Download,
  User,
  LogOut,
  DownloadCloud,
  ChevronDown,
  LayoutTemplate
} from 'lucide-react';
import Swal from 'sweetalert2';
import { Link, useNavigate } from 'react-router-dom';

const PlanCards = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // États pour la Navbar interactive
  const [userName, setUserName] = useState('');
  const [userPlan, setUserPlan] = useState(() => localStorage.getItem('user_plan') || 'Gratuit');
  const [allowedLimit, setAllowedLimit] = useState(() => {
    const savedLimit = localStorage.getItem('user_max_downloads');
    return savedLimit ? parseInt(savedLimit, 10) : 5;
  });
  const [downloadCount, setDownloadCount] = useState(() => {
    const savedCount = localStorage.getItem('download_count');
    return savedCount ? parseInt(savedCount, 10) : 0;
  });

  // Gestion du menu déroulant (Dropdown profil)
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");

    // 1. Récupération des plans d'abonnement disponibles
    const fetchPlans = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/plans`);
        if (!response.ok) throw new Error("Impossible de récupérer les plans");
        const data = await response.json();
        setPlans(data);
      } catch (error) {
        console.error("Erreur API Plans:", error);
        setError("Erreur de connexion au serveur.");
      } finally {
        setLoading(false);
      }
    };

    // 2. Récupération des infos de l'utilisateur connecté (Navbar)
    const fetchUserProfile = async () => {
      if (!token) return;
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
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du profil:", error);
      }
    };

    fetchPlans();
    fetchUserProfile();
  }, []);

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

  const handleSelectPlan = (plan) => {
    if (plan.price > 0) {
      Swal.fire({
        title: `Prendre le plan ${plan.name} ?`,
        text: `Montant à régler : ${plan.price.toLocaleString()} CFA`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#1e293b',
        confirmButtonText: 'Procéder au paiement',
        cancelButtonText: 'Annuler',
        background: '#1e293b',
        color: '#fff'
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/payment', { state: { plan } });
        }
      });
      return;
    }
  
    Swal.fire({
      title: 'Activer le plan Gratuit ?',
      text: 'Vous passerez sur l\'offre standard de base.',
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#1e293b',
      confirmButtonText: 'Confirmer',
      cancelButtonText: 'Annuler',
      background: '#1e293b',
      color: '#fff'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
          
          const response = await fetch(`${import.meta.env.VITE_API_URL}/subscriptions/subscribe`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              planId: plan._id,
              paymentMethod: 'free',
              details: { message: 'Souscription plan gratuit' }
            })
          });
        
          const data = await response.json();
        
          if (!response.ok) {
            throw new Error(data.message || "Impossible d'activer le plan gratuit.");
          }
        
          localStorage.setItem('user_plan', plan.name);
          localStorage.setItem('user_max_downloads', plan.maxDownloads ? plan.maxDownloads.toString() : '5');
        
          await Swal.fire({
            title: 'Plan activé ! 🎉',
            text: `Votre offre ${plan.name} est prête. Vous avez droit à ${plan.maxDownloads || 5} téléchargements.`,
            icon: 'success',
            background: '#1e293b',
            color: '#fff',
            confirmButtonColor: '#3b82f6'
          });
        
          navigate(localStorage.getItem('token') ? '/Home' : '/UserHome');
        
        } catch (error) {
          console.error("Erreur plan gratuit :", error);
          Swal.fire({
            title: 'Erreur d\'activation',
            text: error.message || 'Une erreur est survenue en contactant le serveur.',
            icon: 'error',
            background: '#1e293b',
            color: '#fff'
          });
        }
      }
    });
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/"; 
  };

  const getBackPath = () => {
    if (localStorage.getItem('token')) return '/Home';
    if (localStorage.getItem('adminToken')) return '/UserHome'; 
    return '/'; 
  };

 if (loading) return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans flex flex-col antialiased">
      <div className="py-16 px-4 max-w-7xl mx-auto flex-grow w-full">
        
        {/* En-tête statique affiché pendant le chargement */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Nos <span className="text-blue-500">Tarifs</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Débloquez tout votre potentiel. Passez au niveau supérieur et téléchargez vos CV selon vos besoins.
          </p>
        </div>

        {/* Grille de Skeleton Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((index) => (
            <div 
              key={index} 
              className="flex flex-col p-8 rounded-3xl border border-slate-800 bg-slate-900/40 animate-pulse min-h-[500px]"
            >
              <div className="mb-8 text-center flex flex-col items-center">
                {/* Skeleton Titre */}
                <div className="h-6 w-32 bg-slate-700/50 rounded-full mb-6"></div>
                {/* Skeleton Prix */}
                <div className="h-12 w-48 bg-slate-700/50 rounded-xl mb-4"></div>
                {/* Skeleton Durée */}
                <div className="h-3 w-24 bg-slate-700/50 rounded-full mt-2"></div>
              </div>

              {/* Skeleton Lignes de fonctionnalités */}
              <div className="space-y-6 mb-10 flex-1 mt-4">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-slate-700/50 rounded-full shrink-0"></div>
                    <div className="h-3.5 bg-slate-700/50 rounded-full w-full"></div>
                  </div>
                ))}
              </div>

              {/* Skeleton Bouton */}
              <div className="w-full h-14 bg-slate-700/50 rounded-2xl mt-auto"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] text-slate-400">
      <AlertTriangle size={48} className="text-amber-500 mb-4" />
      <p>{error}</p>
      <Link to={getBackPath()} className="mt-4 text-blue-500 hover:underline">Retour</Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans flex flex-col antialiased">
      {/* --- CONTENU --- */}
      <div className="py-16 px-4 max-w-7xl mx-auto flex-grow">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Nos <span className="text-blue-500">Tarifs</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Débloquez tout votre potentiel. Passez au niveau supérieur et téléchargez vos CV selon vos besoins.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div 
              key={plan._id}
              className={`relative flex flex-col p-8 rounded-3xl border transition-all duration-300 hover:translate-y-[-8px] ${
                plan.isPopular 
                ? 'bg-slate-800/50 border-blue-500 shadow-2xl shadow-blue-500/10' 
                : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-6 py-1.5 rounded-full shadow-lg">
                  recommandé
                </div>
              )}

              <div className="mb-8 text-center">
                <h3 className="text-xl font-bold text-white mb-4">{plan.name}</h3>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-5xl font-black text-white">{plan.price}</span>
                  <span className="text-slate-500 text-sm font-bold uppercase">CFA</span>
                </div>
                <p className="text-slate-500 text-[10px] mt-3 uppercase tracking-widest font-black opacity-70">
                  {plan.duree} JOURS D'ACCÈS
                </p>
              </div>

              <div className="space-y-4 mb-10 flex-1">
                {/* LIGNE LIÉE AU QUOTA DYNAMIQUE DE TÉLÉCHARGEMENTS */}
                <div className="flex items-start gap-3 text-emerald-400 text-sm font-semibold">
                  <Download size={18} className="text-emerald-400 flex-shrink-0" />
                  <span>Jusqu'à {plan.maxDownloads} téléchargements PDF</span>
                </div>

                {(Array.isArray(plan.features) 
                  ? plan.features 
                  : (plan.features ? plan.features.split(',') : [])
                ).map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                    <Check size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
                    <span>{typeof feature === 'string' ? feature.trim() : feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSelectPlan(plan)}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  plan.isPopular 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20' 
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                {plan.price === 0 ? 'Commencer Gratuitement' : 'Choisir ce plan'}
                <Zap size={16} fill={plan.isPopular ? "currentColor" : "none"} />
              </button>
            </div>
          ))}
        </div>

        {/* --- FOOTER SÉCURITÉ --- */}
        <div className="mt-16 flex flex-col items-center gap-2 text-slate-500">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-tighter">
            <ShieldCheck size={16} className="text-emerald-500" />
            Paiements 100% sécurisés
          </div>
          <p className="text-[10px] opacity-50 uppercase tracking-widest">
            © 2026 CV.Craft by Informatics
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlanCards;