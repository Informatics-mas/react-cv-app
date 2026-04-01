import React from 'react';
import { Quote } from 'lucide-react';

function Profile({ data, onChange }) {
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Mise à jour de la clé 'summary' ou 'profile' dans ton objet general
    onChange({ ...data, [name]: value });
  };

  return (
    <div className="bg-[#1e293b] p-6 rounded-xl border border-slate-700 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-slate-300 text-xs font-bold uppercase flex items-center gap-2">
          <Quote size={14} className="text-amber-500" /> 
          Accroche / Profil Professionnel
        </label>
        <span className="text-[10px] text-slate-500 font-mono">
          {data.summary?.length || 0} / 3500
        </span>
      </div>

      <div className="relative group">
        <textarea
          name="summary"
          placeholder="Développeur passionné par React et le design UI/UX, j'accompagne les entreprises dans la création d'interfaces modernes..."
          value={data.summary || ""}
          onChange={handleChange}
          rows="10"
          className="w-full bg-[#0f172a] border border-slate-600 rounded-lg px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all resize-none leading-relaxed"
        />
        
        {/* Petit indicateur visuel en bas à droite */}
        <div className="absolute bottom-3 right-3 opacity-20 group-focus-within:opacity-100 transition-opacity">
           <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 italic">
        Astuce : Résumez vos points forts et vos objectifs de carrière en 4-5 lignes.
      </p>
    </div>
  );
}

export default Profile;