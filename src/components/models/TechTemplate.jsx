// src/components/templates/TechTemplate.jsx
import { User, Mail, Phone, MapPin, Code, Briefcase, GraduationCap } from 'lucide-react';

const TechTemplate = ({ data }) => {
  
  const { general, education, experience, skills, langue, hobbi, theme } = data;

  return (
    <div className="w-full min-h-[842px] bg-white p-8 flex flex-col gap-6">
      
      {/* HEADER : STYLE BANNIÈRE */}
      <header className="w-full p-8 rounded-3xl flex justify-between items-center text-white" style={{ backgroundColor: theme.sidebarBg }}>
        <div className="space-y-2">
          <h1 className="text-3xl font-black uppercase tracking-tight">{general.name || "Votre Nom"}</h1>
          <p className="text-lg font-medium opacity-90" style={{ color: theme.accentColor }}>{general.title || "Développeur Fullstack"}</p>
          <div className="flex gap-4 pt-2 opacity-70 text-[11px]">
            <span className="flex items-center gap-1"><Mail size={12}/> {general.email}</span>
            <span className="flex items-center gap-1"><Phone size={12}/> {general.phone}</span>
          </div>
        </div>
        {general.img && (
          <img src={general.img} alt="Profile" className="w-24 h-24 rounded-2xl object-cover border-2 shadow-2xl" style={{ borderColor: theme.accentColor }} />
        )}
      </header>

      <div className="flex flex-col md:flex-row gap-6 flex-1">
        
        {/* COLONNE GAUCHE : INFOS SECONDAIRES (FLOTTANTE) */}
        <aside className="w-full md:w-56 space-y-6">
          
          {/* COMPÉTENCES AVEC STYLE "BADGE" */}
          <div className="p-5 rounded-3xl border-2 border-slate-100 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: theme.sidebarBg }}>
              <Code size={14} style={{ color: theme.accentColor }} /> Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {skills.map(s => (
                <span key={s.id} className="text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200 text-slate-600">
                  {s.competence || s.nom}
                </span>
              ))}
            </div>
          </div>

          {/* LANGUES */}
          <div className="p-5 rounded-3xl border-2 border-slate-100 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Langues</h3>
            {langue.map(l => (
              <div key={l.id} className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-700">{l.langue || l.nom}</span>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accentColor }}></div>
              </div>
            ))}
          </div>
        </aside>

        {/* COLONNE DROITE : LE CONTENU PRINCIPAL */}
        <main className="flex-1 space-y-6">
          
          {/* PROFIL / RÉSUMÉ */}
          <section className="relative p-6 bg-slate-50 rounded-3xl">
             <div className="absolute top-0 left-6 w-12 h-1" style={{ backgroundColor: theme.accentColor }}></div>
             <p className="text-[13px] text-slate-600 leading-relaxed italic">
               "{general.summary}"
             </p>
          </section>

          {/* EXPÉRIENCES */}
          <section className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-[4px] flex items-center gap-2 text-slate-800">
              <Briefcase size={16} style={{ color: theme.accentColor }} /> Expériences
            </h2>
            <div className="space-y-4">
              {experience.map(exp => (
                <div key={exp.id} className="group p-4 rounded-2xl hover:bg-slate-50 transition-colors border-l-4" style={{ borderLeftColor: theme.accentColor }}>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-900 text-sm">{exp.position}</h4>
                    <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-1 rounded-full border border-slate-100">
                      {exp.start} — {exp.end}
                    </span>
                  </div>
                  <p className="text-[12px] font-bold text-slate-500 mb-2">{exp.company}</p>
                  <p className="text-[11px] text-slate-400 leading-snug">{exp.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FORMATION */}
          <section className="space-y-4">
            <h2 className="text-sm font-black uppercase tracking-[4px] flex items-center gap-2 text-slate-800">
              <GraduationCap size={16} style={{ color: theme.accentColor }} /> Formation
            </h2>
            {education.map(edu => (
              <div key={edu.id} className="pl-4 border-l-2 border-slate-100">
                <h4 className="font-bold text-slate-900 text-[13px]">{edu.school}</h4>
                <p className="text-[11px] font-medium" style={{ color: theme.accentColor }}>{edu.title}</p>
                <p className="text-[10px] text-slate-400">{edu.date}</p>
              </div>
            ))}
          </section>

        </main>
      </div>
    </div>
  );
};

export default TechTemplate;