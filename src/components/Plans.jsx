import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Zap, 
  Star, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  ArrowLeft 
} from 'lucide-react';
import Swal from 'sweetalert2';
import { Link, useNavigate } from 'react-router-dom';

const PlanCards = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
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
    fetchPlans();
  }, []);

  const handleSelectPlan = (plan) => {
    Swal.fire({
      title: `Prendre le plan ${plan.name} ?`,
      text: `Montant à régler : ${plan.price} CFA`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#1e293b',
      confirmButtonText: 'Confirmer',
      cancelButtonText: 'Annuler',
      background: '#1e293b',
      color: '#fff'
    }).then((result) => {
      if (result.isConfirmed) {
        // Redirection vers paiement ou traitement
        console.log("Choix du plan :", plan._id);
        // navigate('/payment', { state: { plan } }); // Exemple de redirection
      }
    });
  };

  const getBackPath = () => {
    if (localStorage.getItem('adminToken')) return '/Home';
    if (localStorage.getItem('token')) return '/UserHome'; 
    return '/'; 
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-[#0f172a]">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-500"></div>
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
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* --- BARRE DE NAVIGATION --- */}
      <nav className="w-full border-b border-slate-800/50 bg-[#131b2e]/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex justify-between items-center p-6 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <FileText size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight">CV.Craft</span>
          </Link>
          
          <Link to={getBackPath()} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors">
            <ArrowLeft size={16} />
            Retour
          </Link>
        </div>
      </nav>

      {/* --- CONTENU --- */}
      <div className="py-16 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Nos <span className="text-blue-500">Tarifs</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Débloquez tout votre potentiel. Passez au niveau supérieur et téléchargez vos CV sans aucune limite.
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
                  Le plus choisi
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
            © {new Date().getFullYear()} CV.Craft by Informatics
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlanCards;