import { useEffect, useState, useCallback } from "react";
import { 
  User as UserIcon, 
  Trash2, 
  Search, 
  UserPlus, 
  ShieldCheck, 
  Mail, 
  Calendar,
  RefreshCw,
  MoreVertical,
  AlertCircle
} from "lucide-react";

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const API_URL = `${import.meta.env.API_URL}/users`;
  const token = localStorage.getItem("token");

  const fetchUsers = useCallback(async () => {
    // On récupère le token ici, juste avant l'appel
    const currentToken = localStorage.getItem("token");

    if (!currentToken) {
      setError("Session expirée. Veuillez vous reconnecter.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(API_URL, {
        headers: { 
          "Authorization": `Bearer ${currentToken}`,
          "Content-Type": "application/json"
        },
      });

      if (res.status === 401) {
        throw new Error("401");
      }

      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Erreur de chargement des utilisateurs:", err);
      if (err.message === "401") {
        setError("Votre session a expiré (401).");
      } else {
        setError("Impossible de charger la liste des utilisateurs.");
      }
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (userId) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ?")) return;

    try {
      const res = await fetch(`${API_URL}/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Erreur lors de la suppression");

      setUsers((prev) => prev.filter((user) => user._id !== userId));
    } catch (err) {
      alert("Erreur technique lors de la suppression.");
    }
  };

  // Filtrage des utilisateurs
  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-blue-500 animate-pulse">
      <RefreshCw className="animate-spin mb-4" size={32} />
      <p className="font-medium">Synchronisation des membres...</p>
    </div>
  );

  return (
    <div className="bg-[#0f172a] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* --- HEADER --- */}
      <div className="p-6 border-b border-slate-800 bg-[#1e293b]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserIcon className="text-blue-500" size={24} /> Gestion des Utilisateurs
          </h2>
          <p className="text-slate-400 text-xs mt-1">Gérez les comptes et les accès de la plateforme.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text"
              placeholder="Chercher un nom ou email..."
              className="bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-64 transition-all text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 p-2.5 rounded-xl transition-colors shadow-lg shadow-blue-600/20">
            <UserPlus size={18} />
          </button>
        </div>
      </div>

      {error && (
        <div className="m-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* --- TABLE --- */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-900/50 text-slate-400 text-[11px] uppercase tracking-wider">
              <th className="py-4 px-6 font-bold">Identité</th>
              <th className="py-4 px-6 font-bold">Rôle</th>
              <th className="py-4 px-6 font-bold">Date d'inscription</th>
              <th className="py-4 px-6 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-20 text-center text-slate-500 italic">
                  Aucun utilisateur trouvé dans la base.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user._id} className="hover:bg-slate-800/30 transition-colors group">
                  
                  {/* COLONNE IDENTITÉ */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold">
                        {user.name ? user.name.charAt(0).toUpperCase() : <UserIcon size={16} />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                          {user.name || "Sans nom"}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <Mail size={12} /> {user.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* COLONNE RÔLE */}
                  <td className="py-4 px-6 flex">
                    <RoleBadge role={user.role} />
                  </td>

                  {/* COLONNE DATE */}
                  <td className="py-4 px-6">
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <Calendar size={14} className="text-slate-600" />
                      {new Date(user.createdAt || Date.now()).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      })}
                    </div>
                  </td>

                  {/* COLONNE ACTIONS */}
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-all">
                        <MoreVertical size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(user._id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER TABLE */}
      <div className="p-4 bg-slate-900/30 border-t border-slate-800 text-center">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
          Total : {filteredUsers.length} utilisateurs affichés
        </p>
      </div>
    </div>
  );
}

// Composant Badge pour les Rôles
const RoleBadge = ({ role }) => {
  const isAdmin = role?.toLowerCase() === "admin";
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
      isAdmin 
        ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
        : "bg-slate-800 text-slate-400 border-slate-700"
    }`}>
      {isAdmin ? (
        <span className="flex items-center gap-1">
          <ShieldCheck size={10} /> Admin
        </span>
      ) : "Membre"}
    </span>
  );
};