import { useState, useEffect, useCallback } from "react";
import { 
  LayoutTemplate, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  RefreshCw, 
  AlertCircle,
  Star,
  X
} from "lucide-react";

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState(null);

  // État du formulaire conforme à ton modèle Mongoose
  const [formData, setFormData] = useState({
    name: "Free",
    price: 0,
    duree: 30,
    features: "",
    description: "",
    isPopular: false
  });

  const API_URL = `${import.meta.env.VITE_API_URL}/plans`;
  const token = localStorage.getItem("adminToken");

  // --- CHARGEMENT DES PLANS ---
  const fetchPlans = useCallback(async () => {
    try {
      console.log("Appel API vers :", API_URL);
      setLoading(true);
      const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Erreur lors de la récupération des plans");
      const data = await res.json();
      setPlans(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // --- SOUMISSION (CRÉER OU MODIFIER) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const method = isEditing ? "PUT" : "POST";
    const url = isEditing ? `${API_URL}/${currentPlanId}` : API_URL;

    // Préparation des données (conversion de la chaîne features en tableau)
    const payload = {
      ...formData,
      features: formData.features.split(",").map(f => f.trim()).filter(f => f !== "")
    };

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Une erreur est survenue");

      // Reset
      resetForm();
      fetchPlans();
    } catch (err) {
      setError(err.message);
    }
  };

  // --- SUPPRESSION ---
  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce plan définitivement ?")) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchPlans();
    } catch (err) {
      setError("Erreur lors de la suppression");
    }
  };

  // --- PRÉPARATION MODIFICATION ---
  const prepareEdit = (plan) => {
    setIsEditing(true);
    setCurrentPlanId(plan._id);
    setFormData({
      name: plan.name,
      price: plan.price,
      duree: plan.duree,
      features: plan.features.join(", "),
      description: plan.description,
      isPopular: plan.isPopular || false
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setFormData({ name: "Free", price: 0, duree: 30, features: "", description: "", isPopular: false });
    setIsEditing(false);
    setCurrentPlanId(null);
  };

  if (loading && plans.length === 0) {
    return (
      <div className="flex justify-center p-20 text-blue-500">
        <RefreshCw className="animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      
      {/* SECTION FORMULAIRE */}
      <div className="bg-[#0b1120] rounded-3xl border border-slate-800 p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
            <div className="p-2 bg-blue-600/20 rounded-lg text-blue-500">
              {isEditing ? <Edit3 size={24} /> : <Plus size={24} />}
            </div>
            {isEditing ? "Modifier le Plan" : "Créer un nouveau Plan"}
          </h2>
          {isEditing && (
            <button onClick={resetForm} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm">
              <X size={16} /> Annuler
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Nom (Enum) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Type de Plan</label>
            <select 
              className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-blue-500"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            >
              <option value="Free">Free</option>
              <option value="Basic">Basic</option>
              <option value="Premium">Premium</option>
            </select>
          </div>

          {/* Prix */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Prix (XOF)</label>
            <input 
              type="number" 
              className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-blue-500"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              required
            />
          </div>

          {/* Durée */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Durée (en jours)</label>
            <input 
              type="number" 
              className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-blue-500"
              value={formData.duree}
              onChange={(e) => setFormData({...formData, duree: e.target.value})}
              required
            />
          </div>

          {/* Features */}
          <div className="flex flex-col gap-2 lg:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Avantages (séparés par des virgules)</label>
            <input 
              type="text" 
              placeholder="Ex: 5 CV, Support 24/7, Export PDF..."
              className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-blue-500"
              value={formData.features}
              onChange={(e) => setFormData({...formData, features: e.target.value})}
            />
          </div>

          {/* Is Popular */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Mise en avant</label>
            <label className="flex items-center gap-3 bg-slate-900 border border-slate-700 p-3 rounded-xl cursor-pointer">
              <input 
                type="checkbox" 
                className="w-5 h-5 rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-800"
                checked={formData.isPopular}
                onChange={(e) => setFormData({...formData, isPopular: e.target.checked})}
              />
              <span className="text-sm text-slate-300">Plan populaire</span>
            </label>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2 lg:col-span-3">
            <label className="text-xs font-bold text-slate-500 uppercase">Description (min 10 car.)</label>
            <textarea 
              rows="2"
              className="bg-slate-900 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-blue-500 resize-none"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
          </div>

          <button type="submit" className="lg:col-span-3 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95">
            {isEditing ? "Mettre à jour le Plan" : "Enregistrer le Plan"}
          </button>
        </form>
      </div>

      {/* GRILLE D'AFFICHAGE DES PLANS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div 
            key={plan._id} 
            className={`relative bg-[#0b1120]/50 rounded-3xl border ${plan.isPopular ? 'border-blue-500 shadow-blue-500/10' : 'border-slate-800'} p-6 flex flex-col justify-between backdrop-blur-sm transition-all hover:translate-y-[-5px]`}
          >
            {plan.isPopular && (
              <div className="absolute -top-3 right-6 bg-blue-600 text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-widest shadow-lg">
                <Star size={10} fill="currentColor" /> Populaire
              </div>
            )}

            <div>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-black text-white">{plan.name}</h3>
                <span className="text-[10px] text-slate-500 font-mono">ID: {plan._id.slice(-4)}</span>
              </div>
              
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-black text-white">{plan.price.toLocaleString()}</span>
                <span className="text-slate-400 text-sm font-bold uppercase">XOF</span>
              </div>
              <p className="text-slate-500 text-xs font-medium mb-6">Valable {plan.duree} jours</p>
              
              <div className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle size={14} className="text-blue-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-slate-500 italic border-t border-slate-800/50 pt-4 mb-6">
                "{plan.description}"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => prepareEdit(plan)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all text-xs font-bold"
              >
                <Edit3 size={14} /> Éditer
              </button>
              <button 
                onClick={() => handleDelete(plan._id)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-bold"
              >
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}