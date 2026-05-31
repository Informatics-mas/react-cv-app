import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Sparkles, 
  LayoutTemplate, 
  Heart, 
  Mail,
  ArrowLeft,
  Lock,
  CheckCircle2,
  User,
  LogOut,
  DownloadCloud
} from 'lucide-react';
import Swal from 'sweetalert2';

function Models() {
  const navigate = useNavigate();

  // Récupération du plan actuel de l'utilisateur
  const [userPlan] = useState(() => {
    return localStorage.getItem('user_plan') || 'Free'; // 'Free', 'Basic', ou 'Premium'
  });

  const [allowedLimit] = useState(() => {
    return parseInt(localStorage.getItem('user_max_downloads') || '5', 10);
  });

  const [downloadCount] = useState(() => {
    return parseInt(localStorage.getItem('download_count') || '0', 10);
  });

  // Définition de la hiérarchie des plans pour restreindre les accès
  const planHierarchy = { 'Free': 1, 'Basic': 2, 'Premium': 3 };

  // Tableau enrichi avec les accès (plan requis)
  const CV_MODELS = [
    { id: 'classic', name: 'Classique', desc: 'Minimaliste et professionnel', color: 'bg-slate-500', planRequired: 'Free' },
    { id: 'Classic', name: 'Classic Blue', desc: 'Design intemporel et structuré', color: 'bg-blue-900', planRequired: 'Free' },
    { id: 'Minimalist', name: 'Minimaliste', desc: 'Épuré au maximum, focus contenu', color: 'bg-zinc-500', planRequired: 'Free' },
    
    { id: 'modern', name: 'Moderne', desc: 'Design épuré avec sidebar colorée', color: 'bg-blue-500', planRequired: 'Basic' },
    { id: 'benjamin', name: 'Benjamin', desc: 'Design moderne et aéré', color: 'bg-violet-500', planRequired: 'Basic' },
    { id: 'tech', name: 'Tech', desc: 'Idéal pour les profils IT et ingénieurs', color: 'bg-emerald-500', planRequired: 'Basic' },
    
    { id: 'designer', name: 'Designer', desc: 'Design artistique et créatif', color: 'bg-pink-500', planRequired: 'Premium' },
    { id: 'futuristic', name: 'Futuriste', desc: 'Design innovant et d\'avant-garde', color: 'bg-purple-500', planRequired: 'Premium' },
    { id: 'Arch', name: 'Arch Design', desc: 'Structure architecturale premium', color: 'bg-amber-600', planRequired: 'Premium' },
  ];

  const getBackPath = () => {
    if (localStorage.getItem('token')) return '/Home';
    if (localStorage.getItem('token')) return '/UserHome';
    return '/';
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("cv_data_pro");
    window.location.href = "/"; 
  };

  // Validation de l'accès au modèle choisi
  const handleSelectModel = (model) => {
    const userLevel = planHierarchy[userPlan] || 1;
    const requiredLevel = planHierarchy[model.planRequired];

    if (userLevel >= requiredLevel) {
      // L'utilisateur a le niveau requis
      navigate('/create', { state: { selectedTemplate: model.id } });
    } else {
      // Niveau insuffisant
      Swal.fire({
        title: `Modèle ${model.planRequired} requis`,
        text: `Le modèle "${model.name}" n'est pas disponible avec votre offre actuelle (${userPlan}). Veuillez changer d'offre pour y accéder.`,
        icon: 'lock',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#1e293b',
        confirmButtonText: 'Voir les offres',
        cancelButtonText: 'Plus tard',
        background: '#1e293b',
        color: '#fff'
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/plans');
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans flex flex-col antialiased">
      
      {/* --- BANDEAU DE NAVIGATION TYPIQUE --- */}
      <nav className="w-full border-b border-slate-900 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-50">
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

          {/* Profil et Compteurs */}
          <div className="flex items-center gap-3 sm:gap-6">
            
            {/* Offre */}
            <div className="hidden xs:flex flex-col items-end border-r border-slate-800/80 pr-3 sm:pr-4">
              <span className="text-[9px] uppercase font-black tracking-widest text-slate-500">Mon offre</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${userPlan === 'Free' ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wide text-slate-200">{userPlan}</span>
              </div>
            </div>

            {/* Quotas */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-900/60 border border-slate-800/60 px-3 py-1.5 rounded-xl">
              <DownloadCloud size={13} className="text-blue-400" />
              <span className="text-xs font-bold text-slate-300">
                {allowedLimit - downloadCount} <span className="text-slate-500 font-medium">/ {allowedLimit} restants</span>
              </span>
            </div>

            {/* Menu Actions */}
            <div className="flex items-center gap-1.5 bg-slate-900/40 p-1 rounded-xl border border-slate-800/40">
              <Link 
                to={getBackPath()} 
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold"
              >
                <User size={14} /> <span className="hidden md:inline">Mon Espace</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all"
                title="Déconnexion"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Barre de retour */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        <Link to={getBackPath()} className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={14} /> Retour au tableau de bord
        </Link>
      </div>

      {/* --- SECTION TITRE --- */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-8 pb-2 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight flex flex-col sm:flex-row items-center gap-2.5 justify-center sm:justify-start">
          <LayoutTemplate className="text-blue-500 w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10" />
          Nos Modèles de <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">CV Professionnels</span>
        </h1>
        <p className="text-slate-400 text-xs sm:text-sm mt-2 max-w-xl mx-auto sm:mx-0">
          Choisissez un modèle adapté à votre secteur. Débloquez les designs avancés avec nos forfaits Basic et Premium.
        </p>
      </div>

      {/* --- GRILLE DES MODÈLES GRILLE ULTRA-RESPONSIVE --- */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-grow">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {CV_MODELS.map((model) => {
            const isLocked = (planHierarchy[userPlan] || 1) < planHierarchy[model.planRequired];
            
            return (
              <div 
                key={model.id}
                className="group relative bg-slate-900/40 border border-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 backdrop-blur-md hover:border-slate-700 transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Badge du Plan requis */}
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
                  <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                    model.planRequired === 'Free' ? 'bg-slate-800 text-slate-300 border border-slate-700' :
                    model.planRequired === 'Basic' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
                    'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                  }`}>
                    {model.planRequired === 'Free' ? 'Gratuit' : model.planRequired}
                  </span>
                </div>

                {/* Preview / Image Visuelle */}
                <div className={`w-full aspect-[4/5] rounded-xl sm:rounded-2xl ${model.color} bg-opacity-20 flex flex-col items-center justify-center relative group-hover:bg-opacity-30 transition-all border border-slate-800/50 mb-4 sm:mb-5`}>
                  {isLocked ? (
                    <div className="bg-slate-950/90 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800/80 text-center shadow-xl mx-4">
                      <Lock className="text-purple-400 mx-auto mb-1.5 animate-bounce" size={20} />
                      <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">Verrouillé</p>
                    </div>
                  ) : (
                    <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-white/20 group-hover:text-white/40 group-hover:scale-110 transition-all duration-300" />
                  )}
                </div>

                {/* Contenu textuel */}
                <div className="space-y-1 mb-4 sm:mb-5">
                  <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                    {model.name}
                    {!isLocked && <CheckCircle2 size={15} className="text-emerald-500" />}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{model.desc}</p>
                </div>

                {/* Bouton d'action */}
                <button
                  onClick={() => handleSelectModel(model)}
                  className={`w-full py-3 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    isLocked 
                      ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white'
                      : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/10'
                  }`}
                >
                  {isLocked ? 'Débloquer le modèle' : 'Utiliser ce modèle'}
                </button>
              </div>
            );
          })}
        </div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/20 py-6 mt-auto text-center px-4">
        <p className="text-slate-500 text-xs">© 2026 CV.Craft. Tous droits réservés.</p>
      </footer>
    </div>
  );
}

export default Models;