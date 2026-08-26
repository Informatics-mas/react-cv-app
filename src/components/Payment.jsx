import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  CreditCard, 
  ArrowLeft, 
  CheckCircle2, 
  Loader2, 
  Smartphone, 
  Lock,
  FileText,
  User,
  LogOut,
  DownloadCloud
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Récupération du plan sélectionné passé via le state de react-router
  const { plan } = location.state || {};
  
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' ou 'mobile'
  const [loading, setLoading] = useState(false);
  
  // États locaux pour la Navbar typique de ton site (lus depuis le localStorage)
  const [userPlan, setUserPlan] = useState(() => {
    return localStorage.getItem('user_plan') || 'Gratuit';
  });

  const [allowedLimit, setAllowedLimit] = useState(() => {
    const savedLimit = localStorage.getItem('user_max_downloads');
    return savedLimit ? parseInt(savedLimit, 10) : 5;
  });

  const [downloadCount, setDownloadCount] = useState(() => {
    const savedCount = localStorage.getItem('download_count');
    return savedCount ? parseInt(savedCount, 10) : 0;
  });

  const [formData, setFormData] = useState({
    cardNumber: '',
    expiry: '',
    cvc: '',
    name: '',
    phoneNumber: '',
    provider: 'orange' // 'orange', 'mtn', 'moov', 'wave'
  });

  // Sécurité : Si aucun plan n'est sélectionné, on redirige vers les tarifs
  useEffect(() => {
    if (!plan) {
      Swal.fire({
        title: 'Aucun plan sélectionné',
        text: 'Veuillez choisir un plan d\'abonnement avant de procéder au paiement.',
        icon: 'warning',
        confirmButtonColor: '#3b82f6',
        background: '#1e293b',
        color: '#fff'
      });
      navigate('/plans');
    }
  }, [plan, navigate]);

  if (!plan) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("cv_data_pro");
    window.location.href = "/"; 
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
      if (!token) throw new Error("Utilisateur non authentifié ou session expirée.");

      // Appel à ton API Backend pour enregistrer la souscription
      const response = await fetch(`${import.meta.env.API_URL}/subscriptions/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          planId: plan._id,
          paymentMethod: paymentMethod,
          details: paymentMethod === 'card' ? { name: formData.name } : { phone: formData.phoneNumber, provider: formData.provider }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Le paiement a échoué.");
      }

      // Mise à jour du localStorage pour refléter le nouveau plan sur l'interface
      localStorage.setItem('user_plan', plan.name);
      localStorage.setItem('user_max_downloads', plan.maxDownloads ? plan.maxDownloads.toString() : '5');

      // Succès
      await Swal.fire({
        title: 'Paiement Réussi ! 🎉',
        text: `Votre abonnement au plan ${plan.name} est désormais actif.`,
        icon: 'success',
        confirmButtonColor: '#3b82f6',
        background: '#1e293b',
        color: '#fff'
      });

      // Redirection vers l'espace utilisateur
      navigate(localStorage.getItem('token') ? '/Home' : '/UserHome');

    } catch (error) {
      console.error("Erreur Paiement:", error);
      Swal.fire({
        title: 'Échec du paiement',
        text: error.message || 'Une erreur est survenue lors de la transaction.',
        icon: 'error',
        confirmButtonColor: '#ef4444',
        background: '#1e293b',
        color: '#fff'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans flex flex-col antialiased">
      {/* Barre de fil d'Ariane / Retour */}
      <div className="max-w-5xl w-full mx-auto px-6 pt-6">
        <Link to="/plans" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={16} /> Retour aux plans
        </Link>
      </div>

      {/* --- CORPS PRINCIPAL DU COMPOSANT --- */}
      <div className="max-w-5xl w-full mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8 flex-grow">
        
        {/* --- COLONNE GAUCHE & CENTRE : FORMULAIRE DE PAIEMENT --- */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-6 md:p-8 backdrop-blur-md">
            <h2 className="text-xl font-black uppercase tracking-tight mb-2 flex items-center gap-2">
              <CreditCard className="text-blue-500" /> Mode de Paiement
            </h2>
            <p className="text-slate-400 text-sm mb-6">Sélectionnez votre canal de paiement sécurisé.</p>

            {/* Sélecteurs de méthode de paiement (Carte vs Mobile Money) */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-2xl border text-sm font-bold flex flex-col items-center gap-2 transition-all ${
                  paymentMethod === 'card'
                    ? 'bg-blue-600/10 border-blue-500 text-white shadow-lg shadow-blue-500/5'
                    : 'bg-slate-900/20 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <CreditCard size={20} />
                Carte Bancaire
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('mobile')}
                className={`p-4 rounded-2xl border text-sm font-bold flex flex-col items-center gap-2 transition-all ${
                  paymentMethod === 'mobile'
                    ? 'bg-blue-600/10 border-blue-500 text-white shadow-lg shadow-blue-500/5'
                    : 'bg-slate-900/20 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Smartphone size={20} />
                Mobile Money
              </button>
            </div>

            {/* Formulaire de Paiement */}
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              {paymentMethod === 'card' ? (
                /* --- FORMULAIRE CARTE BANCAIRE --- */
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Nom sur la carte</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Numéro de Carte</label>
                    <input
                      type="text"
                      name="cardNumber"
                      required
                      maxLength="16"
                      value={formData.cardNumber}
                      onChange={handleInputChange}
                      placeholder="4000 1234 5678 9010"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Expiration</label>
                      <input
                        type="text"
                        name="expiry"
                        required
                        placeholder="MM/AA"
                        maxLength="5"
                        value={formData.expiry}
                        onChange={handleInputChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">CVC</label>
                      <input
                        type="password"
                        name="cvc"
                        required
                        maxLength="3"
                        value={formData.cvc}
                        onChange={handleInputChange}
                        placeholder="•••"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* --- FORMULAIRE MOBILE MONEY --- */
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Opérateur</label>
                    <select
                      name="provider"
                      value={formData.provider}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      <option value="orange">Orange Money</option>
                      <option value="mtn">MTN MoMo</option>
                      <option value="wave">Wave</option>
                      <option value="moov">Moov Money</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Numéro de Téléphone</label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      required
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="Ex: 0707070707"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    * Vous recevrez une notification Push de validation sur votre téléphone pour confirmer le débit.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Traitement en cours...
                  </>
                ) : (
                  `Payer ${plan.price.toLocaleString()} CFA`
                )}
              </button>
            </form>
          </div>

          <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Lock size={12} /> Cryptage SSL 256-bits</span>
            <span>•</span>
            <span className="flex items-center gap-1"><ShieldCheck size={12} className="text-emerald-500" /> Conforme PCI-DSS</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gradient-to-b from-slate-900 via-slate-900/60 to-transparent border border-slate-800/60 rounded-3xl p-6 relative overflow-hidden">
            {plan.isPopular && (
              <div className="absolute top-4 right-4 bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                Populaire
              </div>
            )}
            
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Résumé de la commande</p>
            <h3 className="text-2xl font-black uppercase tracking-tight mb-4">{plan.name}</h3>
            
            <div className="flex items-baseline gap-1 text-3xl font-black mb-1 border-b border-slate-800 pb-4">
              {plan.price.toLocaleString()} <span className="text-xs text-slate-400 font-medium tracking-normal">CFA / {plan.duree} Jours</span>
            </div>

            <div className="space-y-3 my-6">
              {plan.features && plan.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                  <CheckCircle2 size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
                  <span>{typeof feature === 'string' ? feature.trim() : feature}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-800 pt-4 space-y-2 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Sous-total</span>
                <span>{plan.price.toLocaleString()} CFA</span>
              </div>
              <div className="flex justify-between">
                <span>Frais de transaction</span>
                <span className="text-emerald-400">Gratuit</span>
              </div>
              <div className="flex justify-between font-bold text-white text-sm border-t border-slate-800/50 pt-2 mt-2">
                <span>Total à régler</span>
                <span className="text-blue-400">{plan.price.toLocaleString()} CFA</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}