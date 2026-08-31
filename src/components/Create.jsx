import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import Swal from 'sweetalert2';
import { 
  ArrowLeft, User, GraduationCap, Download, Briefcase, 
  Languages, Heart, Zap, Upload, Palette, Trash2, ArrowRight
} from 'lucide-react';

// --- Imports des composants formulaires ---
import GeneralInfo from './Generalinfo';
import Profile from './Profile'; 
import Education from './Education';
import Experience from './Experience';
import Hobbi from './hobbi'; 
import Langue from './langue'; 
import Skills from './skils'; 

// --- Imports des Modèles ---
import ModernTemplate from './models/ModernTemplate';
import DesignerTemplate from './models/DesignerTemplate';
import ClassicTemplate from './models/ClassicTemplate';
import TechTemplate from './models/TechTemplate';
import BenjaminTemplate from './models/BenjaminTemplate';
import FuturisticTemplate from './models/FuturisticTemplate';
import MinimalistGreyTemplate from './models/MinimalistGreyTemplate';
import ArchTemplate from './models/ArchDesignTemplate';
import ClassicBlueTemplate from './models/ClassicBlueTemplate';
import ClassicGreyTemplate from './models/ClassicGreyTemplate';
import ModernBlueTemplate from './models/ModernBlueTemplate';

const TEMPLATES_MAP = {
  modern: ModernTemplate,
  classic: ClassicTemplate,
  tech: TechTemplate,
  benjamin: BenjaminTemplate,
  designer: DesignerTemplate,
  futuristic: FuturisticTemplate,
  Arch: ArchTemplate,
  Minimalist: MinimalistGreyTemplate,
  Classic: ClassicBlueTemplate,
  Classicgrey: ClassicGreyTemplate,
  Modernblue: ModernBlueTemplate
};

function Create() {
  const navigate = useNavigate();
  const location = useLocation();
  const componentRef = useRef(null); 
  const fileInputRef = useRef(null);
  
  const userPlan = localStorage.getItem('user_plan') || 'Free';

  // --- GESTION DES QUOTAS ---
  const [allowedLimit, setAllowedLimit] = useState(() => parseInt(localStorage.getItem('user_max_downloads') || '5', 10));
  const [downloadCount, setDownloadCount] = useState(() => parseInt(localStorage.getItem('download_count') || '0', 10));

  useEffect(() => {
    const syncUserPlanLimit = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/plans`);
        if (response.ok) {
          const plans = await response.json();
          const currentPlan = plans.find(p => p.name.toLowerCase() === userPlan.toLowerCase());
          if (currentPlan?.maxDownloads) {
            setAllowedLimit(currentPlan.maxDownloads);
            localStorage.setItem('user_max_downloads', currentPlan.maxDownloads.toString());
          }
        }
      } catch (error) {
        console.error("Erreur sync API:", error);
      }
    };
    syncUserPlanLimit();
  }, [userPlan]);

  useEffect(() => {
    if (location.state?.selectedTemplate) {
      setCvData(prev => ({
        ...prev,
        theme: { ...prev.theme, template: location.state.selectedTemplate }
      }));
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  const [cvData, setCvData] = useState(() => {
     const templateFromUrl = new URLSearchParams(window.location.search).get('template');
     const saved = localStorage.getItem('cv_data_pro');
     
     if (saved) {
       const parsedData = JSON.parse(saved);
       if (templateFromUrl) parsedData.theme.template = templateFromUrl;
       return parsedData;
     }
     
     return {
       general: { img: null, title: '', name: '', email: '', phone: '', location: '', summary: '' },
       education: [],
       experience: [],
       hobbi: [],
       langue: [],
       skills: [],
       theme: { sidebarBg: '#1e293b', accentColor: '#3b82f6', template: templateFromUrl || 'modern' }
     };
  });

  useEffect(() => {
    localStorage.setItem('cv_data_pro', JSON.stringify(cvData));
  }, [cvData]);

  // --- ACTIONS IA & IMPORTATION ---
  const handleImportClick = () => {
    if (userPlan.toLowerCase() !== 'premium') {
      Swal.fire({
        title: 'Fonctionnalité Premium',
        text: 'L\'analyse automatique par IA est réservée aux membres Premium.',
        icon: 'lock',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#1e293b',
        confirmButtonText: 'Voir les offres',
        cancelButtonText: 'Plus tard',
        background: '#1e293b',
        color: '#fff'
      }).then((res) => { if (res.isConfirmed) navigate('/plans'); });
      return;
    }
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      Swal.fire({
        title: 'Analyse en cours...',
        text: 'Notre IA extrait vos informations...',
        allowOutsideClick: false,
        background: '#1e293b',
        color: '#fff',
        didOpen: () => Swal.showLoading()
      });

      const formData = new FormData();
      formData.append("cv_file", file);

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/parse-cv`, { method: "POST", body: formData });
        if (!res.ok) throw new Error("Erreur serveur");
        const data = await res.json();
        
        setCvData(prev => ({
          ...prev, ...data,
          general: { ...data.general, img: prev.general.img },
          theme: prev.theme 
        }));
        
        Swal.fire({ title: 'Extraction réussie !', icon: 'success', background: '#1e293b', color: '#fff', confirmButtonColor: '#3b82f6' });
      } catch (err) {
        Swal.fire({ title: 'Erreur', text: 'Impossible d\'analyser le PDF.', icon: 'error', background: '#1e293b', color: '#fff' });
      }
    } else if (file.type === "application/json" || file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target.result);
          if (importedData.general && importedData.theme) {
            setCvData(importedData);
            Swal.fire({ title: 'Succès', icon: 'success', background: '#1e293b', color: '#fff' });
          } else throw new Error();
        } catch {
          Swal.fire({ title: 'Fichier corrompu', icon: 'error', background: '#1e293b', color: '#fff' });
        }
      };
      reader.readAsText(file);
    }
  };

  const resetCV = () => {
    if (window.confirm("Tout effacer et recommencer à zéro ?")) {
      localStorage.removeItem('cv_data_pro');
      window.location.reload(); 
    }
  };

  // --- IMPRESSION STRICTE A4 ---
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `CV_${cvData.general.name || 'Export'}`.replace(/\s+/g, '_'),
    pageStyle: `
      @page { 
        size: A4 portrait; 
        margin: 0 !important; 
      }
      @media print {
        html, body {
          height: 297mm !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #cv-preview {
          display: flex !important;
          flex-direction: row !important; 
          width: 210mm !important;
          height: 297mm !important;
          max-width: 210mm !important;
          max-height: 297mm !important;
          box-shadow: none !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important; 
          page-break-inside: avoid !important;
          page-break-after: avoid !important;
        }
        #cv-preview > div {
          height: 100% !important;
          max-height: 297mm !important;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `,
  });

  const isLimitReached = downloadCount >= allowedLimit;

  const handleDownloadClick = () => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    if (!token) return Swal.fire({ title: 'Connexion requise', text: 'Vous devez être connecté pour télécharger.', icon: 'warning', background: '#1e293b', color: '#fff' });

    if (isLimitReached) {
      Swal.fire({
        title: 'Limite atteinte', text: `Passez à un plan supérieur pour continuer.`,
        icon: 'info', confirmButtonText: 'Voir les offres', background: '#1e293b', color: '#fff', confirmButtonColor: '#3b82f6'
      }).then((res) => { if (res.isConfirmed) navigate('/plans'); });
      return;
    }

    handlePrint();
    
    const newCount = downloadCount + 1;
    setDownloadCount(newCount);
    localStorage.setItem('download_count', newCount.toString());
  };

  const updateGeneral = (newData) => {
    if (newData.img instanceof File) {
      const reader = new FileReader();
      reader.onloadend = () => setCvData(prev => ({ ...prev, general: { ...newData, img: reader.result } }));
      reader.readAsDataURL(newData.img);
    } else {
      setCvData(prev => ({ ...prev, general: newData }));
    }
  };

  const addItem = (section) => {
    const defaults = {
      education: { school: '', title: '', date: '' },
      experience: { company: '', position: '', desc: '', start: '', end: '' },
      hobbi: { loisir: '' },
      langue: { nom: '', niveau: '' },
      skills: { nom: '' }
    };
    setCvData(prev => ({ ...prev, [section]: [...prev[section], { id: Date.now(), ...defaults[section] }] }));
  };

  const updateItem = (section, id, newData) => setCvData(prev => ({ ...prev, [section]: prev[section].map(item => item.id === id ? newData : item) }));
  const removeItem = (section, id) => setCvData(prev => ({ ...prev, [section]: prev[section].filter(item => item.id !== id) }));

  const SelectedTemplate = TEMPLATES_MAP[cvData.theme.template] || ModernTemplate;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0f172a]">
      
      {/* --- COLONNE GAUCHE : ÉDITEUR --- */}
      <div className="w-full lg:w-[450px] xl:w-[500px] bg-[#1e293b] border-b lg:border-b-0 lg:border-r border-slate-700 lg:h-screen lg:overflow-y-auto scrollbar-hide flex flex-col">
        
        {/* Header Fixe */}
        <div className="sticky top-0 z-20 bg-[#1e293b]/95 backdrop-blur-sm border-b border-slate-700/50 p-4 sm:p-6 flex items-center justify-between">
          <Link to={localStorage.getItem('token') ? '/Home' : '/'} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium">
            <ArrowLeft size={16} /> Retour
          </Link>
          <button 
            onClick={resetCV}
            className="flex items-center gap-1.5 text-xs bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <Trash2 size={14} /> Réinitialiser
          </button>
        </div>

        <div className="p-4 sm:p-6 flex-grow space-y-8 pb-10">
          
          {/* Outils de Design & Actions */}
          <section className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
            <h2 className="text-white font-bold text-xs uppercase tracking-widest mb-5 flex items-center gap-2">
              <Palette size={16} className="text-blue-500" /> Apparence & Actions
            </h2>
            
            <div className="flex justify-between items-center mb-5 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-slate-600 overflow-hidden relative cursor-pointer">
                  <input type="color" value={cvData.theme.sidebarBg} onChange={(e) => setCvData({...cvData, theme: {...cvData.theme, sidebarBg: e.target.value}})} className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" />
                </div>
                <span className="text-xs font-medium text-slate-300">Couleur 1</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-slate-600 overflow-hidden relative cursor-pointer">
                  <input type="color" value={cvData.theme.accentColor} onChange={(e) => setCvData({...cvData, theme: {...cvData.theme, accentColor: e.target.value}})} className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" />
                </div>
                <span className="text-xs font-medium text-slate-300">Couleur 2</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link to="/Models" className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border border-slate-700">
                Changer de modèle
              </Link>
              <button type="button" onClick={handleImportClick} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/20">
                <Upload size={16} /> Importer
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json,.pdf" className="hidden" />
          </section>

          {/* Formulaires */}
          <div className="space-y-10">
            {[
              { icon: User, title: "Infos Personnelles", color: "text-blue-400", comp: <GeneralInfo data={cvData.general} onChange={updateGeneral} /> },
              { icon: Briefcase, title: "Profil", color: "text-amber-400", comp: <Profile data={cvData.general} onChange={updateGeneral} /> },
              { icon: GraduationCap, title: "Formation", color: "text-purple-400", comp: <Education data={cvData.education} onAdd={() => addItem('education')} onUpdate={(id, data) => updateItem('education', id, data)} onRemove={(id) => removeItem('education', id)} /> },
              { icon: Briefcase, title: "Expériences", color: "text-emerald-400", comp: <Experience data={cvData.experience} onAdd={() => addItem('experience')} onUpdate={(id, data) => updateItem('experience', id, data)} onRemove={(id) => removeItem('experience', id)} /> },
              { icon: Zap, title: "Compétences", color: "text-blue-400", comp: <Skills data={cvData.skills} onAdd={() => addItem('skills')} onUpdate={(id, data) => updateItem('skills', id, data)} onRemove={(id) => removeItem('skills', id)} /> },
              { icon: Languages, title: "Langues", color: "text-pink-400", comp: <Langue data={cvData.langue} onAdd={() => addItem('langue')} onUpdate={(id, data) => updateItem('langue', id, data)} onRemove={(id) => removeItem('langue', id)} /> },
              { icon: Heart, title: "Loisirs", color: "text-red-400", comp: <Hobbi data={cvData.hobbi} onAdd={() => addItem('hobbi')} onUpdate={(id, data) => updateItem('hobbi', id, data)} onRemove={(id) => removeItem('hobbi', id)} /> }
            ].map((section, idx) => (
              <section key={idx} className="bg-slate-900/30 p-5 rounded-2xl border border-slate-800/50">
                <div className={`flex items-center gap-2 mb-5 ${section.color}`}>
                  <section.icon size={20} />
                  <h2 className="font-bold uppercase tracking-wider text-sm">{section.title}</h2>
                </div>
                {section.comp}
              </section>
            ))}
          </div>
        </div>
      </div>

      {/* --- COLONNE DROITE : PREVIEW VISIBLE --- */}
      <div className="flex-1 bg-[#0f172a] p-4 sm:p-6 overflow-y-auto flex flex-col items-center gap-6">
        
        {/* Bandeau de téléchargement */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-4 rounded-2xl w-full max-w-[595px] flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-4 z-10 shadow-xl">
          <div className="text-center sm:text-left">
            <p className="text-white font-bold text-sm">Prêt à exporter ?</p>
            <p className="text-slate-400 text-xs">
              {isLimitReached ? 'Limite atteinte.' : `Il vous reste ${allowedLimit - downloadCount} téléchargement(s).`}
            </p>
          </div>
          
          {isLimitReached ? (
            <Link to="/plans" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg animate-pulse">
              <Zap size={16} fill="currentColor" /> Passer Premium
            </Link>
          ) : (
            <button onClick={handleDownloadClick} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-900/20 hover:scale-105">
              <Download size={16} /> Télécharger PDF
            </button>
          )}
        </div>

        {/* Zone de prévisualisation A4 Parfaite */}
        <div className="w-full overflow-x-auto pb-8 flex justify-start md:justify-center class-preview-scroll scrollbar-hide">
          <div 
            ref={componentRef} 
            id="cv-preview" 
            className="w-[595px] min-w-[595px] print:max-w-none print:w-[210mm] print:h-[297mm] print:shadow-none bg-white shadow-2xl relative flex flex-col justify-between overflow-hidden"
            style={{ minHeight: '297mm' }} 
          >
            {/* Rendu Dynamique du Composant */}
            <div className="flex-1">
              <SelectedTemplate data={cvData} />
            </div>

            {/* Filigrane (Plan Free uniquement) */}
            {userPlan.toLowerCase() === 'free' && (
              <div className="absolute bottom-2 right-3 text-[9px] text-slate-300/80 font-medium tracking-wider flex items-center gap-1 print:text-slate-400/60 z-50 pointer-events-none select-none">
                <span>Créé avec</span>
                <span className="font-bold text-blue-600">CV.Craft</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default Create;