import { useEffect, useState, useCallback } from "react";
import Swal from "sweetalert2";
import { 
  Calendar, 
  User as UserIcon, 
  ShieldCheck, 
  AlertCircle, 
  Edit3, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Search
} from "lucide-react";
import { API_BASE_URL } from "../../api/client";

export default function SubscriptionManager() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [searchTerm, setSearchTerm] = useState(""); // Ajout d'une recherche

  const API_URL = `${API_BASE_URL}/subscriptions`;
  const token = localStorage.getItem("token");

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("userRole");
        window.location.href = "/login";
        return;
      }

      const body = await res.json();
      if (!res.ok || !Array.isArray(body.data)) {
        throw new Error(body.message || "Réponse inattendue du serveur.");
      }
      setSubscriptions(body.data);
      setLoadError(null);
    } catch (err) {
      console.error("Erreur de chargement des abonnements:", err);
      // État utilisateur visible (pas seulement console.error)
      setLoadError("Impossible de charger les abonnements. Vérifiez votre connexion puis réessayez.");
    } finally {
      setLoading(false);
    }
  }, [token, API_URL]);

  useEffect(() => {
    const run = async () => { await fetchSubscriptions(); };
    run();
  }, [fetchSubscriptions]);

  // Filtrage pour la recherche
  const filteredSubs = subscriptions.filter(sub => 
    sub.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // --- GESTION DE L'ÉDITION / ACTIONS SUR LES ABONNEMENTS (PUT /subscriptions/:id) ---
  const startEdit = (subscription) => {
    setEditingId(subscription._id);
    setEditData({
      status: subscription.status || "active",
      endDate: subscription.endDate ? subscription.endDate.slice(0, 10) : "",
      autoRenew: subscription.autoRenew || false
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const sendUpdate = async (id, payload) => {
    const res = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      window.location.assign("/login");
      return null;
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Mise à jour impossible.");
    return data;
  };

  const applyUpdatedSub = (id, updated) => {
    setSubscriptions(prev => prev.map(sub => (
      sub._id === id
        ? { ...sub, status: updated.status, endDate: updated.endDate, autoRenew: updated.autoRenew }
        : sub
    )));
  };

  const handleUpdate = async (id) => {
    try {
      const payload = { status: editData.status };
      if (editData.endDate) payload.endDate = editData.endDate;
      const updated = await sendUpdate(id, payload);
      if (updated) {
        applyUpdatedSub(id, updated);
        cancelEdit();
      }
    } catch (err) {
      console.error("Erreur mise à jour abonnement:", err);
      Swal.fire({ title: 'Erreur', text: err.message, icon: 'error', background: '#1e293b', color: '#fff' });
    }
  };

  const handleAction = async (subscription, action) => {
    try {
      const status = action === "cancel" ? "canceled" : "active";
      const updated = await sendUpdate(subscription._id, { status });
      if (updated) applyUpdatedSub(subscription._id, updated);
    } catch (err) {
      console.error("Erreur action abonnement:", err);
      Swal.fire({ title: 'Erreur', text: err.message, icon: 'error', background: '#1e293b', color: '#fff' });
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-blue-500 animate-pulse">
          <RefreshCw className="animate-spin mb-4" size={32} />
          <p className="font-medium">Chargement des données...</p>
        </div>
  );

  return (
    <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* Header du Dashboard */}
      <div className="p-6 border-b border-slate-800 bg-[#1e293b]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="text-blue-500" /> Gestion des Abonnements
          </h2>
          <p className="text-slate-400 text-xs mt-1">Supervisez les accès et les cycles de facturation.</p>
        </div>

        {/* Barre de recherche rapide */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text"
            placeholder="Rechercher un utilisateur..."
            className="bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loadError && (
        <div className="mx-6 mt-4 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="flex-shrink-0" />
          {loadError}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-900/50 text-slate-400 text-[11px] uppercase tracking-wider">
              <th className="py-4 px-6 font-bold">Utilisateur</th>
              <th className="py-4 px-6 font-bold">Plan</th>
              <th className="py-4 px-6 font-bold">Période</th>
              <th className="py-4 px-6 font-bold text-center">Statut</th>
              <th className="py-4 px-6 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredSubs.map((subscription) => (
              <tr key={subscription._id} className="hover:bg-slate-800/30 transition-colors group">
                
                {/* COLONNE UTILISATEUR */}
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                      <UserIcon size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{subscription.userId?.name || "Anonyme"}</div>
                      <div className="text-xs text-slate-500">{subscription.userId?.email || "Pas d'email"}</div>
                    </div>
                  </div>
                </td>

                {/* COLONNE PLAN */}
                <td className="py-4 px-6">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-800 border border-slate-700 text-slate-300">
                    {subscription.planId?.name || "Standard"}
                  </span>
                </td>

                {/* COLONNE DATES */}
                <td className="py-4 px-6">
                  {editingId === subscription._id ? (
                    <input
                      type="date"
                      className="bg-slate-900 border border-slate-700 p-2 rounded text-xs text-white"
                      value={editData.endDate}
                      onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                    />
                  ) : (
                    <div className="text-xs space-y-1">
                      <div className="text-slate-500 flex items-center gap-1"><Calendar size={12} /> {formatDate(subscription.startDate)}</div>
                      <div className="text-white font-medium">→ {formatDate(subscription.endDate)}</div>
                    </div>
                  )}
                </td>

                {/* COLONNE STATUT */}
                <td className="py-4 px-6 text-center">
                  <div className="flex flex-col items-center gap-1">
                    {editingId === subscription._id ? (
                      <select
                        className="bg-slate-900 border border-slate-700 p-1.5 rounded text-xs text-white"
                        value={editData.status}
                        onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="expired">Expired</option>
                        <option value="canceled">Canceled</option>
                      </select>
                    ) : (
                      <StatusBadge status={subscription.status} />
                    )}
                    {subscription.autoRenew && (
                      <span className="text-[9px] text-blue-400 font-bold uppercase tracking-tighter">Auto-Renew ON</span>
                    )}
                  </div>
                </td>

                {/* COLONNE ACTIONS */}
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {editingId === subscription._id ? (
                      <>
                        <button onClick={() => handleUpdate(subscription._id)} className="p-2 bg-green-600 rounded-lg hover:bg-green-500 transition-colors"><CheckCircle2 size={16}/></button>
                        <button onClick={cancelEdit} className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"><XCircle size={16}/></button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => startEdit(subscription)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleAction(subscription, subscription.status === "active" ? "cancel" : "activate")}
                          className={`p-2 rounded-lg transition-all ${subscription.status === "active" ? "text-red-400 hover:bg-red-400/10" : "text-emerald-400 hover:bg-emerald-400/10"}`}
                        >
                          {subscription.status === "active" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                        </button>
                      </>
                    )}
                  </div>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Petit composant interne pour les badges
const StatusBadge = ({ status }) => {
  const styles = {
    active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    canceled: "bg-red-500/10 text-red-500 border-red-500/20",
    expired: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  };
  return (
    <span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase ${styles[status] || styles.expired}`}>
      {status}
    </span>
  );
};