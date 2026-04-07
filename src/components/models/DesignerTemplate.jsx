// src/components/templates/DesignerTemplate.jsx
import { Mail, Phone, MapPin, User, Sparkles } from 'lucide-react';

const DesignerTemplate = ({ data }) => {
  const { general, education, experience, skills, langue, theme } = data;

  return (
    <div className="w-full min-h-[842px] bg-white text-slate-800 font-sans p-10 flex flex-col gap-10">
      
      {/* 1. HERO HEADER : Typo Grasse et Photo Intégrée */}
      <header className="grid grid-cols-6 gap-1 items-center border-b pb-5 border-slate-100">
        <div className="col-span-4 space-y-4">
          <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-slate-500">
             <Sparkles size={14} style={{ color: theme.accentColor }} />
             <span className="text-[10px] font-bold uppercase tracking-wider">Profil Créatif</span>
          </div>
          <h1 className="text-[24px] font-extrabold tracking-tighter text-slate-950 leading-[0.9]">
            {general.name || "Votre Nom"}
          </h1>
          <p className="text-xl font-medium tracking-tight" style={{ color: theme.accentColor }}>
            {general.title || "Designer & Développeur"}
          </p>
        </div>
        
        <div className="col-span-1 relative h-[150px] w-[150px] ">
          {general.img ? (
            <img 
              src={general.img} 
              alt="Profil" 
              className="w-full h-full object-cover rounded-4xl shadow-2xl rotate-3 scale-105 transition-transform group-hover:rotate-0"
              style={{ borderColor: theme.accentColor }}
            />
          ) : (
            <div className="w-full h-full rounded-3xl bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-200">
              <User size={60} className="text-slate-300" />
            </div>
          )}
          {/* Accent graphique derrière la photo */}
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full opacity-20" style={{ backgroundColor: theme.accentColor }}></div>
        </div>
      </header>

      {/* 2. CONTACT & PROFIL (LAYOUT FLOTTANT) */}
      <section className="grid grid-cols-5 gap-4 items-start">
        {/* Barre de contact compacte à gauche */}
        <div className="col-span-2 flex flex-col gap-3 text-[11px] text-slate-500 font-medium">
          <span className="flex items-center gap-2 border border-slate-100 p-2 rounded-xl">
            <Mail size={14} style={{ color: theme.accentColor }} /> 
            <span className="break-all">{general.email}</span>
          </span>
          <span className="flex items-center gap-2 border border-slate-100 p-2 rounded-xl">
            <Phone size={14} style={{ color: theme.accentColor }} /> 
            {general.phone}
          </span>
        </div>

        {/* Résumé de profil format 'accroche' */}
        <div className="col-span-3 p-6 bg-slate-50 rounded-2xl relative overflow-hidden border border-slate-100">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 translate-x-10 -translate-y-10" style={{ backgroundColor: theme.sidebarBg }}></div>
          <p className="text-[13px] text-slate-700 leading-relaxed font-medium text-justify relative z-10">
            "{general.summary}"
          </p>
        </div>
      </section>

      {/* 3. EXPERTISE & LANGUES (LAYOUT EN CARTES) */}
      <section className="grid grid-cols-2 gap-8">
        {/* Compétences stylisées comme des 'étiquettes' */}
        {skills.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[3px] text-slate-900 flex items-center gap-2">
              <span className="w-6 h-[1px] bg-slate-200"></span> Expertise Tech
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {skills.map(s => (
                <span key={s.id} className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-slate-100 bg-white text-slate-600 shadow-sm hover:border-slate-200 hover:shadow transition-all">
                  {s.competence || s.nom}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Langues avec puces colorées */}
        {langue.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[3px] text-slate-900 flex items-center gap-2">
              <span className="w-6 h-[1px] bg-slate-200"></span> Langues
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {langue.map(l => (
                <div key={l.id} className="flex justify-between items-center p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                  <span className="text-[11px] font-bold text-slate-700 uppercase">{l.langue || l.nom}</span>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.accentColor }}></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 4. EXPÉRIENCES & FORMATION (LAYOUT CHRONOLOGIQUE) */}
      <section className="space-y-10 pt-4 flex-1">
        
        {/* Expériences : Timeline à bordures */}
        <div className="space-y-6">
          <h2 className="text-sm font-black uppercase tracking-[5px] text-slate-900 flex items-center gap-2">
            <BriefcaseIcon accent={theme.accentColor} /> Expériences Clés
          </h2>
          <div className="space-y-6">
            {experience.map(exp => (
              <div key={exp.id} className="p-1 bg-white rounded-2xl border-l-4 group transition-colors hover:border-slate-200" style={{ borderColor: theme.sidebarBg }}>
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="font-bold text-slate-950 text-[15px]">{exp.position}</h4>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                    {exp.start} — {exp.end}
                  </span>
                </div>
                <p className="text-[12px] font-bold mb-3" style={{ color: theme.accentColor }}>{exp.company}</p>
                <p className="text-[12px] text-slate-500 leading-relaxed italic">{exp.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Formation : Plus compacte */}
        <div className="space-y-6">
          <h2 className="text-sm font-black uppercase tracking-[5px] text-slate-900 flex items-center gap-2">
            <EducationIcon accent={theme.accentColor} /> Parcours Académique
          </h2>
          <div className="grid grid-cols-2 gap-6 pl-4 border-l-2 border-slate-100">
            {education.map(edu => (
              <div key={edu.id} className="relative">
                <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full border-2 border-white" style={{ backgroundColor: theme.accentColor }}></div>
                <h4 className="font-bold text-slate-950 text-[14px]">{edu.school}</h4>
                <p className="text-[12px] font-medium" style={{ color: theme.accentColor }}>{edu.title}</p>
                <p className="text-[11px] text-slate-400">{edu.date}</p>
              </div>
            ))}
          </div>
        </div>

      </section>
    </div>
  );
};

// Petits icônes SVG personnalisés pour le style Designer
const BriefcaseIcon = ({accent}) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: accent}}>
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);

const EducationIcon = ({accent}) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{color: accent}}>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
  </svg>
);

export default DesignerTemplate;