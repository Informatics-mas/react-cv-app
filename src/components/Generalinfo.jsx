// src/components/Generalinfo.jsx
import { User, Camera } from 'lucide-react';
import '../styles/Generalinfo.css';

function Generalinfo({ data, onChange }) {
  
  // Gestion des champs texte classiques
  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  // Gestion de l'image avec conversion Base64 pour le LocalStorage
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    
    if (file) {
      // Vérification de la taille (Optionnel : max 1Mo pour éviter de saturer le localStorage)
      if (file.size > 1024 * 1024) {
        alert("L'image est trop lourde (max 1Mo).");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        // reader.result contient la chaîne Base64 de l'image
        onChange({ ...data, img: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="section-container bg-slate-800/20 p-6 rounded-xl border border-slate-700/50 shadow-inner">
      <h2 className="text-white font-bold text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
        <User size={18} className="text-blue-400" />
        Informations Générales
      </h2>

      <div className="form-group flex flex-col gap-4">
        
        {/* ZONE DE TÉLÉCHARGEMENT PHOTO AVEC PREVIEW */}
        <div className="flex items-center gap-5 p-4 bg-slate-900/40 rounded-lg border border-slate-700 hover:border-slate-500 transition-all group">
          <div className="relative w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center border-2 border-dashed border-slate-600 overflow-hidden shrink-0">
            {data.img ? (
              <img 
                src={data.img} 
                alt="Aperçu" 
                className="w-full h-full object-cover"
              />
            ) : (
              <Camera className="text-slate-500 group-hover:text-blue-400 transition-colors" size={24} />
            )}
            <input 
              type="file" 
              accept="image/*"
              onChange={handleImageChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              title="Choisir une photo"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-white text-xs font-bold uppercase italic">Photo de profil</span>
            <span className="text-slate-500 text-[10px]">Cliquez sur le cercle pour modifier</span>
          </div>
        </div>

        {/* CHAMPS DE TEXTE */}
        <div className="grid grid-cols-1 gap-3">
          <input 
            name="name" 
            placeholder="Nom complet" 
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-all shadow-sm"
            value={data.name} 
            onChange={handleChange} 
            required 
          />
          
          <input 
            name="title" 
            placeholder="Intitulé du poste (ex: Développeur Fullstack)" 
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-all shadow-sm"
            value={data.title} 
            onChange={handleChange} 
            required 
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input 
              name="email" 
              type="email" 
              placeholder="Email professionnel" 
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-all shadow-sm"
              value={data.email} 
              onChange={handleChange} 
              required 
            />
            
            <input 
              name="phone" 
              placeholder="Téléphone" 
              className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-all shadow-sm"
              value={data.phone} 
              onChange={handleChange} 
            />
          </div>
        </div>

      </div>
    </div>
  );
}

export default Generalinfo;