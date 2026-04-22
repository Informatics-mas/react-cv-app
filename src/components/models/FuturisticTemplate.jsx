// src/components/templates/FuturisticTemplate.jsx
import { User, Mail, Phone, Rocket, Orbit, Zap, BrainCircuit, Globe } from 'lucide-react';

const FuturisticTemplate = ({ data }) => {
  const { general, education, experience, skills, langue, theme } = data;

  // Couleur d'accentuation très légère pour les fonds
  const accentLight = `${theme.accentColor}08`; 

  return (
    <div className="w-full min-h-[297mm] bg-[#f8fafc] text-slate-800 font-sans flex flex-col print:w-[210mm]">
      
      {/* --- HEADER : Minimaliste & Tech --- */}
      <header className="relative z-10 grid grid-cols-4 gap-6 items-center p-10 bg-[#0f172a] text-white">
        {/* Photo avec un contour néon très fin */}
        <div className="col-span-1">
          {general.img ? (
            <img 
              src={general.img} 
              alt="Profil" 
              className="w-36 h-36 object-cover rounded-full border-r-4 border-b-4"
              style={{ borderColor: theme.accentColor }}
            />
          ) : (
            <div className="w-32 h-32 bg-slate-800 flex items-center justify-center border-r-4 border-b-4" style={{ borderColor: theme.accentColor }}>
              <User size={40} className="text-slate-600" />
            </div>
          )}
        </div>
        
        {/* Nom et Titre */}
        <div className="col-span-2 space-y-2">
          <h1 className="text-4xl font-light tracking-[6px] uppercase">
            {general.name ? general.name.split(' ')[0] : "CORE"}
            <span className="font-black" style={{ color: theme.accentColor }}>
               {general.name ? ` ${general.name.split(' ').slice(1).join(' ')}` : ".DATA"}
            </span>
          </h1>
          <p className="text-sm font-bold tracking-[3px] uppercase opacity-80 flex items-center gap-2">
            <Orbit size={16} style={{ color: theme.accentColor }} />
            {general.title || "Software Architect"}
          </p>
        </div>

        {/* Contact style "Terminal" */}
        <div className="col-span-1 text-[11px] font-mono space-y-1 border-l border-slate-700 pl-6">
          <p className="flex items-center gap-2"><Mail size={12} style={{color: theme.accentColor}}/> {general.email}</p>
          <p className="flex items-center gap-2"><Phone size={12} style={{color: theme.accentColor}}/> {general.phone}</p>
          {/* <p className="flex items-center gap-2"><Globe size={12} style={{color: theme.accentColor}}/> PORTFOLIO.SYS</p> */}
        </div>
      </header>

      {/* --- Corps du CV --- */}
      <div className="grid grid-cols-12 flex-1">
        
        {/* --- SIDEBAR GAUCHE (Data) --- */}
        <div className="col-span-4 bg-slate-100/50 p-8 border-r border-slate-200 space-y-10">
          
          {/* Profil */}
          <section>
            <h3 className="text-[11px] font-black uppercase tracking-[3px] mb-4 flex items-center gap-2 text-slate-400">
              <div className="w-4 h-[1px] bg-slate-400"></div> 01. Profil
            </h3>
            <p className="text-[13px] text-slate-600 leading-relaxed font-medium italic border-l-2 pl-4" style={{ borderColor: theme.accentColor }}>
              {general.summary || "Expert en développement de systèmes complexes..."}
            </p>
          </section>

          {/* Skills avec barres de progression discrètes */}
          <section>
            <h3 className="text-[11px] font-black uppercase tracking-[3px] mb-6 flex items-center gap-2 text-slate-400">
              <div className="w-4 h-[1px] bg-slate-400"></div> 02. Stack
            </h3>
            <div className="space-y-4">
              {skills.map(s => (
                <div key={s.id} className="group">
                  <div className="flex justify-between text-[11px] font-bold uppercase mb-1">
                    <span>{s.competence || s.nom}</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity" style={{color: theme.accentColor}}>READY</span>
                  </div>
                  <div className="h-[2px] bg-slate-200 w-full">
                    <div className="h-full transition-all duration-1000" style={{ width: '100%', backgroundColor: theme.accentColor }}></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Langues */}
          {langue.length > 0 && (
            <section>
              <h3 className="text-[11px] font-black uppercase tracking-[3px] mb-4 text-slate-400">03. Langues</h3>
              <div className="space-y-2">
                {langue.map(l => (
                  <div key={l.id} className="flex justify-between items-center bg-white p-2 border border-slate-200">
                    <span className="text-[11px] font-bold uppercase">{l.langue || l.nom}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* --- CONTENU PRINCIPAL (Logs) --- */}
        <div className="col-span-8 p-10 space-y-12">
          
          {/* Expériences */}
          <section>
            <h2 className="text-sm font-black uppercase tracking-[4px] text-slate-900 mb-8 flex items-center gap-3">
              <Rocket size={18} style={{color: theme.accentColor}} /> Expériences_Professionnelles
            </h2>
            <div className="space-y-8">
              {experience.map(exp => (
                <div key={exp.id} className="relative pl-8 border-l border-slate-200 group">
                  {/* Petit curseur futuriste */}
                  <div className="absolute -left-[1px] top-0 w-[1px] h-0 group-hover:h-full transition-all duration-300" style={{ backgroundColor: theme.accentColor }}></div>
                  <div className="absolute -left-[4px] top-0 w-2 h-2 rounded-full bg-slate-200 group-hover:bg-blue-500 transition-colors"></div>

                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-black text-slate-900 text-[16px] uppercase tracking-tight">{exp.position}</h4>
                      <p className="text-[13px] font-bold" style={{ color: theme.accentColor }}>{exp.company}</p>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-1">
                      {exp.start} — {exp.end}
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-500 leading-relaxed text-justify">
                    {exp.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Éducation */}
          <section>
            <h2 className="text-sm font-black uppercase tracking-[4px] text-slate-900 mb-6 flex items-center gap-3">
              <Zap size={18} style={{color: theme.accentColor}} /> Formation_Académique
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {education.map(edu => (
                <div key={edu.id} className="p-4 border border-slate-200 hover:bg-slate-50 transition-colors">
                  <p className="text-[10px] font-mono text-slate-400 mb-1">{edu.date}</p>
                  <h4 className="font-bold text-slate-900 text-[13px] uppercase mb-1">{edu.school}</h4>
                  <p className="text-[12px] font-medium" style={{ color: theme.accentColor }}>{edu.title}</p>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>

    </div>
  );
};

export default FuturisticTemplate;