import { useState, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import GeneralInfo from './Generalinfo';
import Profile from './Profile'; 
import Education from './Education';
import Experience from './Experience';
import Hobbi from './hobbi'; 
import Langue from './langue'; 
import Skills from './skils'; 
import ModernTemplate from './models/ModernTemplate';
import DesignerTemplate from './models/DesignerTemplate';
import ClassicTemplate from './models/ClassicTemplate';
import TechTemplate from './models/TechTemplate';
import BenjaminTemplate from './models/BenjaminTemplate';
import FuturisticTemplate from './models/FuturisticTemplate';
import MinimalistGreyTemplate from './models/MinimalistGreyTemplate';
import ArchTemplate from './models/ArchDesignTemplate';
import ClassicBlueTemplate from './models/ClassicBlueTemplate';
import { 
  ArrowLeft, ArrowRight, User, GraduationCap, Download, Briefcase, 
  Languages, Heart, Zap, Upload 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function Create() {
  const navigate = useNavigate();
  const componentRef = useRef(null); 
  const fileInputRef = useRef(null);

  // --- GESTION DE LA LIMITE DYNAMIQUE DE TÉLÉCHARGEMENT ---
  const [allowedLimit, setAllowedLimit] = useState(() => {
    const savedLimit = localStorage.getItem('user_max_downloads');
    return savedLimit ? parseInt(savedLimit, 10) : 5; 
  });

  const [downloadCount, setDownloadCount] = useState(() => {
    const savedCount = localStorage.getItem('download_count');
    return savedCount ? parseInt(savedCount, 10) : 0;
  });

  // Synchronisation dynamique du quota réel avec la Base de Données
  useEffect(() => {
    const syncUserPlanLimit = async () => {
      try {
        const activePlanName = localStorage.getItem('user_plan') || 'Free';
        const response = await fetch(`${import.meta.env.VITE_API_URL}/plans`);
        if (response.ok) {
          const plans = await response.json();
          const currentPlan = plans.find(p => p.name.toLowerCase() === activePlanName.toLowerCase());
          if (currentPlan && currentPlan.maxDownloads) {
            setAllowedLimit(currentPlan.maxDownloads);
            localStorage.setItem('user_max_downloads', currentPlan.maxDownloads.toString());
          }
        }
      } catch (error) {
        console.error("Impossible de synchroniser le quota avec l'API :", error);
      }
    };

    syncUserPlanLimit();
  }, []);

  const [cvData, setCvData] = useState(() => {
     const queryParams = new URLSearchParams(window.location.search);
     const templateFromUrl = queryParams.get('template');
     const saved = localStorage.getItem('cv_data_pro');
     
     if (saved) {
       const parsedData = JSON.parse(saved);
       if (templateFromUrl) {
         return {
           ...parsedData,
           theme: { ...parsedData.theme, template: templateFromUrl }
         };
       }
       return parsedData;
     }
     
     return {
       general: { img: null, title: '', name: '', email: '', phone: '', summary: '' },
       education: [],
       experience: [],
       hobbi: [],
       langue: [],
       skills: [],
       theme: {
         sidebarBg: '#1e293b',
         accentColor: '#3b82f6',
         template: templateFromUrl || 'modern'
       }
     };
  });

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      Swal.fire({
        title: 'Analyse du PDF en cours...',
        text: 'Notre IA extrait les informations de votre CV pour remplir les champs.',
        allowOutsideClick: false,
        background: '#1e293b',
        color: '#fff',
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const formData = new FormData();
      formData.append("cv_file", file);

      fetch(`${import.meta.env.VITE_API_URL}/parse-cv`, {
        method: "POST",
        body: formData
      })
        .then((res) => {
          if (!res.ok) throw new Error("Erreur serveur lors de l'analyse.");
          return res.json();
        })
        .then((data) => {
          setCvData(prev => ({
            ...prev,
            ...data,
            general: { ...data.general, img: prev.general.img },
            theme: prev.theme 
          }));

          Swal.fire({
            title: 'Extraction réussie !',
            text: 'Les champs ont été pré-remplis à partir de votre PDF.',
            icon: 'success',
            background: '#1e293b',
            color: '#fff',
            confirmButtonColor: '#3b82f6'
          });
        })
        .catch((err) => {
          console.error(err);
          Swal.fire({
            title: 'Erreur',
            text: 'Impossible d\'analyser le PDF. Vérifiez votre fichier.',
            icon: 'error',
            background: '#1e293b',
            color: '#fff'
          });
        });

    } else if (file.type === "application/json" || file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target.result);
          if (importedData.general && importedData.theme) {
            const queryParams = new URLSearchParams(window.location.search);
            const templateFromUrl = queryParams.get('template');
            
            if (templateFromUrl) {
              importedData.theme.template = templateFromUrl;
            }

            setCvData(importedData);
            Swal.fire({
              title: 'Succès !',
              text: 'Vos données de CV ont été importées avec succès.',
              icon: 'success',
              background: '#1e293b',
              color: '#fff'
            });
          } else {
            throw new Error("Format de données invalide");
          }
        } catch (error) {
          Swal.fire({
            title: 'Erreur',
            text: 'Le fichier JSON est corrompu.',
            icon: 'error',
            background: '#1e293b',
            color: '#fff'
          });
        }
      };
      reader.readAsText(file);
    } else {
      Swal.fire({
        title: 'Format non supporté',
        text: 'Veuillez importer un fichier au format PDF ou JSON valide.',
        icon: 'warning',
        background: '#1e293b',
        color: '#fff'
      });
    }
  };

  useEffect(() => {
    localStorage.setItem('cv_data_pro', JSON.stringify(cvData));
  }, [cvData]);

  const resetCV = () => {
    if (window.confirm("Voulez-vous vraiment effacer toutes les données et recommencer ?")) {
      localStorage.removeItem('cv_data_pro');
      window.location.reload(); 
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `CV_${cvData.general.name || 'Export'}`,
    pageStyle: `
      @page { size: A4 portrait; margin: 0; }
      @media print {
        #cv-preview {
          display: flex !important;
          flex-direction: row !important;
          width: 210mm !important;
          height: 297mm !important;
          max-width: none !important;
        }
        #cv-preview > div { height: 100% !important; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    `,
  });

  const isLimitReached = downloadCount >= allowedLimit;

  const getBackPath = () => {
    if (localStorage.getItem('token')) return '/Home';
    if (localStorage.getItem('token')) return '/UserHome';
    return '/';
  };

  const handleDownloadClick = () => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');

    if (isLimitReached) {
      Swal.fire({
        title: 'Limite atteinte',
        text: `Passez à un plan supérieur pour étendre votre crédit actuel de ${allowedLimit} téléchargements.`,
        icon: 'info',
        confirmButtonText: 'Voir les offres',
        background: '#1e293b',
        color: '#fff',
        confirmButtonColor: '#3b82f6'
      }).then((res) => {
        if (res.isConfirmed) navigate('/plans');
      });
      return;
    }

    if (token) {
      handlePrint();
      const newCount = downloadCount + 1;
      setDownloadCount(newCount);
      localStorage.setItem('download_count', newCount.toString());

      if (newCount === 1) {
        localStorage.setItem('first_download_date', new Date().toISOString());
      }
    } else {
      Swal.fire({
        title: 'Connexion requise',
        text: 'Veuillez vous connecter pour télécharger votre CV.',
        icon: 'warning',
        background: '#1e293b',
        color: '#fff'
      });
    }
  };

  const updateGeneral = (newData) => {
    if (newData.img instanceof File) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCvData(prev => ({
          ...prev,
          general: { ...newData, img: reader.result }
        }));
      };
      reader.readAsDataURL(newData.img);
    } else {
      setCvData(prev => ({ ...prev, general: newData }));
    }
  };

  const addItem = (section) => {
    let newItem = { id: Date.now() };
    if (section === 'education') newItem = { ...newItem, school: '', title: '', date: '' };
    else if (section === 'experience') newItem = { ...newItem, company: '', position: '', desc: '', start: '', end: '' };
    else if (section === 'hobbi') newItem = { ...newItem, loisir: '' };
    else if (section === 'langue') newItem = { ...newItem, nom: '', niveau: '' };
    else if (section === 'skills') newItem = { ...newItem, nom: '' };
    
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
      
      {/* --- COLONNE GAUCHE : ÉDITEUR (Responsive : défilant sur desktop, fluide sur mobile) --- */}
      <div className="w-full lg:w-[450px] xl:w-[550px] bg-[#1e293b] border-b lg:border-b-0 lg:border-r border-slate-700 lg:h-screen lg:overflow-y-auto p-4 sm:p-6 scrollbar-hide lg:sticky lg:top-0">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <Link to={getBackPath()} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm">
            <ArrowLeft size={18} />
            <span>Retour</span>
          </Link>
          <h1 className="text-lg sm:text-xl font-bold text-white">Mon CV Professionnel</h1>
          <button 
            onClick={resetCV}
            className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/20 transition-colors"
          >
            Réinitialiser
          </button>
        </div>

        {/* --- PERSONNALISATION & OPTIONS --- */}
        <section className="bg-slate-800/40 p-4 rounded-xl border border-slate-700 mb-6">
          <h2 className="text-white font-bold text-xs uppercase tracking-widest mb-4">Personnalisation & Options</h2>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json,.pdf" className="hidden" />

          <div className="flex flex-col gap-4">
            <div className="flex gap-6 justify-center items-center border-b border-slate-700 pb-4">
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Link to="/Models" className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2.5 px-3 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all border border-slate-600">
                Changer de modèle <ArrowRight size={14} />
              </Link>
              <button type="button" onClick={handleImportClick} className="flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 py-2.5 px-3 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all border border-blue-500/30">
                Importer un CV <Upload size={14} />
              </button>
            </div>
          </div>
        </section>

        {/* --- FORMULAIRES SECTIONS --- */}
        <div className="space-y-8 pb-10 lg:pb-20">
          <section>
            <div className="flex items-center gap-2 mb-4 text-blue-400">
              <User size={20} />
              <h2 className="font-semibold uppercase tracking-wider text-sm">Informations Personnelles</h2>
            </div>
            <GeneralInfo data={cvData.general} onChange={updateGeneral} />
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 text-emerald-400">
              <Heart size={20} />
              <h2 className="font-semibold uppercase tracking-wider text-sm">Loisirs</h2>
            </div>
            <Hobbi data={cvData.hobbi} onAdd={() => addItem('hobbi')} onUpdate={(id, data) => updateItem('hobbi', id, data)} onRemove={(id) => removeItem('hobbi', id)} />
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 text-emerald-400">
              <Languages size={20} />
              <h2 className="font-semibold uppercase tracking-wider text-sm">Langues</h2>
            </div>
            <Langue data={cvData.langue} onAdd={() => addItem('langue')} onUpdate={(id, data) => updateItem('langue', id, data)} onRemove={(id) => removeItem('langue', id)} />
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 text-emerald-400">
              <Zap size={20} />
              <h2 className="font-semibold uppercase tracking-wider text-sm">Compétences</h2>
            </div>
            <Skills data={cvData.skills} onAdd={() => addItem('skills')} onUpdate={(id, data) => updateItem('skills', id, data)} onRemove={(id) => removeItem('skills', id)} />
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 text-amber-400">
              <Briefcase size={20} />
              <h2 className="font-semibold uppercase tracking-wider text-sm">Profil / Accroche</h2>
            </div>
            <Profile data={cvData.general} onChange={updateGeneral} />
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 text-purple-400">
              <GraduationCap size={20} />
              <h2 className="font-semibold uppercase tracking-wider text-sm">Éducation</h2>
            </div>
            <Education data={cvData.education} onAdd={() => addItem('education')} onUpdate={(id, data) => updateItem('education', id, data)} onRemove={(id) => removeItem('education', id)} />
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4 text-emerald-400">
              <Briefcase size={20} />
              <h2 className="font-semibold uppercase tracking-wider text-sm">Expériences</h2>
            </div>
            <Experience data={cvData.experience} onAdd={() => addItem('experience')} onUpdate={(id, data) => updateItem('experience', id, data)} onRemove={(id) => removeItem('experience', id)} />
          </section>
        </div>
      </div>

      {/* --- COLONNE DROITE : PREVIEW (S'adapte parfaitement sur tous les écrans) --- */}
      <div className="flex-1 bg-[#0f172a] p-4 sm:p-6 overflow-y-auto flex flex-col items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <button 
            onClick={handleDownloadClick}
            disabled={isLimitReached}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg w-full sm:w-auto
              ${isLimitReached 
                ? 'bg-slate-700 cursor-not-allowed opacity-50 text-slate-400' 
                : 'bg-emerald-600 hover:bg-emerald-500 hover:scale-105 active:scale-95 text-white'
              }`}
          >           
            <Download size={18} />
            {isLimitReached ? 'Limite atteinte' : 'Télécharger mon CV PDF'}
          </button>
            
          {isLimitReached && (
            <Link to="/plans" className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg animate-pulse w-full sm:w-auto">
              <Zap size={18} fill="currentColor" />
              Changer de Plan
            </Link>
          )}
        </div>
        
        {isLimitReached ? (
          <p className="text-red-400 text-xs mt-1 font-medium bg-red-400/10 px-3 py-1 rounded-full border border-red-400/20 text-center">
            Vous avez atteint votre limite de {allowedLimit} téléchargements liés à votre plan.
          </p>
        ) : (
          downloadCount > 0 && (
            <p className="text-slate-400 text-[10px] mt-1 text-center">
              Téléchargements restants : <span className="text-emerald-400 font-bold">{allowedLimit - downloadCount}</span> / {allowedLimit}
            </p>
          )
        )}

        {/* Zone du conteneur A4 : scroll horizontal automatique si l'écran est plus petit que le format A4 (595px) */}
        <div className="w-full overflow-x-auto pb-4 flex justify-start md:justify-center class-preview-scroll scrollbar-hide">
          <div ref={componentRef} id="cv-preview" className="w-[595px] min-w-[595px] print:max-w-none print:w-[210mm] print:h-[297mm] print:shadow-none bg-white shadow-2xl my-2">
            {cvData.theme.template === 'modern' && <ModernTemplate data={cvData} />}
            {cvData.theme.template === 'classic' && <ClassicTemplate data={cvData} />}
            {cvData.theme.template === 'tech' && <TechTemplate data={cvData} />}
            {cvData.theme.template === 'benjamin' && <BenjaminTemplate data={cvData} />}
            {cvData.theme.template === 'designer' && <DesignerTemplate data={cvData} />}
            {cvData.theme.template === 'futuristic' && <FuturisticTemplate data={cvData} />}
            {cvData.theme.template === 'Arch' && <ArchTemplate data={cvData} />}
            {cvData.theme.template === 'Minimalist' && <MinimalistGreyTemplate data={cvData} />}
            {cvData.theme.template === 'Classic' && <ClassicBlueTemplate data={cvData} />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Create;