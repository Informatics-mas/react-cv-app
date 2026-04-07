import { useState, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import GeneralInfo from './Generalinfo';
import Profile from './Profile'; // Import de ton nouveau composant
import Education from './Education';
import Experience from './Experience';
import Hobbi from './hobbi'; // Nouveau composant pour les loisirs
import Langue from './langue'; // Nouveau composant pour les langues
import Skills from './skils'; // Nouveau composant pour les compétences
import ModernTemplate from './models/ModernTemplate';
import DesignerTemplate from './models/DesignerTemplate';
import ClassicTemplate from './models/ClassicTemplate';
import TechTemplate from './models/TechTemplate';
import MetroTemplate from './models/MetroTemplate';
import { 
  ArrowLeft, ArrowRight, User, GraduationCap, Download, Briefcase, 
  Languages, Heart, Zap, Eye, FileText 
} from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';

function Create() {
  const location = useLocation();
  const componentRef = useRef(null); 

  const [cvData, setCvData] = useState(() => {
     // 1. On récupère le template depuis l'URL (?template=tech)
     const queryParams = new URLSearchParams(location.search);
     const templateFromUrl = queryParams.get('template');
    
     // 2. On regarde s'il y a des données sauvegardées
     const saved = localStorage.getItem('cv_data_pro');
     
     if (saved) {
       const parsedData = JSON.parse(saved);
        
       // FORCE l'utilisation du template de l'URL s'il est présent
       if (templateFromUrl) {
         return {
           ...parsedData,
           theme: { ...parsedData.theme, template: templateFromUrl }
         };
       }
       return parsedData;
     }
     
     // 3. Sinon, on initialise tout à neuf
     return {
       general: { img: '', title: '', name: '', email: '', phone: '', summary: '' },
       education: [],
       experience: [],
       hobbi: [],
       langue: [],
       skills: [],
       theme: {
         sidebarBg: '#1e293b',
         accentColor: '#3b82f6',
         template: templateFromUrl || 'modern' // 'modern' par défaut
       }
     };
  });

  // 2. Sauvegarde automatique : à chaque fois que cvData change
  useEffect(() => {
    localStorage.setItem('cv_data_pro', JSON.stringify(cvData));
  }, [cvData]);

  const resetCV = () => {
    if (window.confirm("Voulez-vous vraiment effacer toutes les données et recommencer ?")) {
      localStorage.removeItem('cv_data_pro');
      window.location.reload(); // Recharge la page pour remettre l'état initial
    }
 };

// Dans le JSX, à côté de "Mon CV Professionnel"

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `CV_${cvData.general.name || 'Export'}`,
    pageStyle: `
    @page { size: portrait; margin: 0; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      #cv-preview { display: flex !important; flex-direction: row !important; }
      /* Force les couleurs choisies par l'utilisateur */
      aside { background-color: ${cvData.theme.sidebarBg} !important; }
      .accent-text { color: ${cvData.theme.accentColor} !important; }
      .accent-border { border-color: ${cvData.theme.accentColor} !important; }
    }
  `,
  });

  // Logique de mise à jour
  const updateGeneral = (newData) => {
    // Si newData contient une image qui est un objet File (venant de l'input)
    if (newData.img instanceof File) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setCvData(prev => ({
          ...prev,
          general: { ...newData, img: base64String }
        }));
      };
      reader.readAsDataURL(newData.img);
    } else {
      // Si c'est une mise à jour de texte classique
      setCvData(prev => ({ ...prev, general: newData }));
    }
  };

  const addItem = (section) => {
  let newItem = { id: Date.now() };

  // Personnalisation selon la section
  if (section === 'education') {
    newItem = { ...newItem, school: '', title: '', date: '' };
  } else if (section === 'experience') {
    newItem = { ...newItem, company: '', position: '', desc: '', start: '', end: '' };
  } else if (section === 'hobbi') {
    newItem = { ...newItem, loisir: '' }; // Correspond à ton composant Hobbi
  } else if (section === 'langue') {
    newItem = { ...newItem, nom: ''};
  } else if (section === 'skills') {
    newItem = { ...newItem, nom: '' };
  }
  
  setCvData(prev => ({ ...prev, [section]: [...prev[section], newItem] }));
};

  const updateItem = (section, id, newData) => {
    setCvData(prev => ({
      ...prev,
      [section]: prev[section].map(item => item.id === id ? newData : item)
    }));
  };

  const removeItem = (section, id) => {
    setCvData(prev => ({
      ...prev,
      [section]: prev[section].filter(item => item.id !== id)
    }));
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0f172a]">
      
      {/* --- COLONNE GAUCHE : ÉDITEUR --- */}
      <div className="w-full min-h-[942px] lg:w-[450px] xl:w-[550px] bg-[#1e293b] border-r border-slate-700 h-screen overflow-y-auto p-6 scrollbar-hide">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
            <ArrowLeft size={20} />
            <span>Retour</span>
          </Link>
          <h1 className="text-xl font-bold text-white">Mon CV Professionnel</h1>
          <button 
            onClick={resetCV}
            className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/20 transition-colors"
          >
            Réinitialiser
          </button>
        </div>

        {/* --- GESTION DU THÈME --- */}
        <section className="bg-slate-800/40 p-4 rounded-xl border border-slate-700 mb-6">
          <h2 className="text-white font-bold text-xs uppercase tracking-widest mb-4">Personnalisation du style</h2>
          <div className="flex gap-6 justify-center items-center">
            <div className="flex flex-col gap-2">
              <label className="text-slate-400 text-[10px] uppercase">Sidebar</label>
              <input 
                type="color" 
                value={cvData.theme.sidebarBg}
                onChange={(e) => setCvData({...cvData, theme: {...cvData.theme, sidebarBg: e.target.value}})}
                className="w-10 h-10 bg-transparent border-none cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-slate-400 text-[10px] uppercase">Accent</label>
              <input 
                type="color" 
                value={cvData.theme.accentColor}
                onChange={(e) => setCvData({...cvData, theme: {...cvData.theme, accentColor: e.target.value}})}
                className="w-10 h-10 bg-transparent border-none cursor-pointer"
              />
            </div>

             <div className="flex flex-col gap-2">
            <Link to="/Models"
              className="flex items-center justify-center gap-2 w-full bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all border border-slate-600 hover:border-blue-500/50"
            >
              Changer de modèle <ArrowRight size={20} />
            </Link>
          </div>

          </div>
        </section>

        <div className="space-y-8 pb-20">
          {/* 1. INFOS GÉNÉRALES */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-blue-400">
              <User size={20} />
              <h2 className="font-semibold uppercase tracking-wider text-sm">Informations Personnelles</h2>
            </div>
            <GeneralInfo data={cvData.general} onChange={updateGeneral} />
          </section>

          {/* 1. Hobbies */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-emerald-400">
              <Heart size={20} />
              <h2 className="font-semibold uppercase tracking-wider text-sm">Expériences</h2>
            </div>
            <Hobbi 
              data={cvData.hobbi} 
              onAdd={() => addItem('hobbi')}
              onUpdate={(id, data) => updateItem('hobbi', id, data)}
              onRemove={(id) => removeItem('hobbi', id)}
            />
          </section>

          {/* 1. Langue */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-emerald-400">
              <Languages size={20} />
              <h2 className="font-semibold uppercase tracking-wider text-sm">Langues</h2>
            </div>
            <Langue 
              data={cvData.langue} 
              onAdd={() => addItem('langue')}
              onUpdate={(id, data) => updateItem('langue', id, data)}
              onRemove={(id) => removeItem('langue', id)}
            />
          </section>

          {/* 1. SKILLS */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-emerald-400">
              <Zap size={20} />
              <h2 className="font-semibold uppercase tracking-wider text-sm ">Compétences</h2>
            </div>
            <Skills 
              data={cvData.skills} 
              onAdd={() => addItem('skills')}
              onUpdate={(id, data) => updateItem('skills', id, data)}
              onRemove={(id) => removeItem('skills', id)}
            />
          </section>

          {/* 2. NOUVELLE SECTION : PROFIL / RÉSUMÉ */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-amber-400">
              <FileText size={20} />
              <h2 className="font-semibold uppercase tracking-wider text-sm">Profil / Accroche</h2>
            </div>
            <Profile data={cvData.general} onChange={updateGeneral} />
          </section>

          {/* 3. ÉDUCATION */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-purple-400">
              <GraduationCap size={20} />
              <h2 className="font-semibold uppercase tracking-wider text-sm">Éducation</h2>
            </div>
            <Education 
              data={cvData.education} 
              onAdd={() => addItem('education')}
              onUpdate={(id, data) => updateItem('education', id, data)}
              onRemove={(id) => removeItem('education', id)}
            />
          </section>

          {/* 4. EXPÉRIENCES */}
          <section>
            <div className="flex items-center gap-2 mb-4 text-emerald-400">
              <Briefcase size={20} />
              <h2 className="font-semibold uppercase tracking-wider text-sm">Expériences</h2>
            </div>
            <Experience 
              data={cvData.experience} 
              onAdd={() => addItem('experience')}
              onUpdate={(id, data) => updateItem('experience', id, data)}
              onRemove={(id) => removeItem('experience', id)}
            />
          </section>
        </div>
      </div>

      {/* --- COLONNE DROITE : PREVIEW --- */}
      <div className="flex-1 bg-[#0f172a] p-4 md:p-5 overflow-y-auto flex flex-col items-center gap-4">
        <button 
          onClick={() => handlePrint()} 
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:scale-105 active:scale-95"
        >           
          <Download size={18} />
          telecharger mon CV PDF
        </button>
        <div ref={componentRef} id="cv-preview" className="w-full max-w-[595px] bg-white shadow-2xl">
  
          {/* Choix du modèle selon le state */}
          {cvData.theme.template === 'modern' && <ModernTemplate data={cvData} />}
          {cvData.theme.template === 'classic' && <ClassicTemplate data={cvData} />}
          {cvData.theme.template === 'tech' && <TechTemplate data={cvData} />}
          {cvData.theme.template === 'metro' && <MetroTemplate data={cvData} />}
          {cvData.theme.template === 'designer' && <DesignerTemplate data={cvData} />}
        </div>
      </div>

      <button className="lg:hidden fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-2xl z-50">
        <Eye size={24} />
      </button>

    </div>
  );
}

export default Create;