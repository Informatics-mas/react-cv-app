// src/components/templates/TechTemplate.jsx
import { User, Mail, Phone, Code, Briefcase, GraduationCap, Globe } from 'lucide-react';

const TechTemplate = ({ data }) => {
  const { general, education, experience, skills, langue, hobbi, theme } = data;

  return (
    <div className="w-full min-h-[297mm] bg-white p-8 flex flex-col gap-8 print:w-[210mm] print:p-8">
      
      {/* HEADER : STYLE BANNIÈRE TECH */}
      <header className="w-full p-10 rounded-[40px] flex justify-between items-center text-white shadow-xl relative overflow-hidden" style={{ backgroundColor: theme.sidebarBg }}>
        {/* Petit effet décoratif discret en fond */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10" style={{ backgroundColor: theme.accentColor, borderRadius: '0 0 0 100%' }}></div>
        
        <div className="space-y-3 z-10">
          <h1 className="text-4xl font-black uppercase tracking-tighter">{general.name || "Votre Nom"}</h1>
          <div className="inline-block px-4 py-1 rounded-full text-sm font-bold bg-white/10 backdrop-blur-md" style={{ color: theme.accentColor }}>
            {general.title || "Développeur Fullstack"}
          </div>
          <div className="flex flex-wrap gap-6 pt-4 opacity-80 text-[11px] font-mono">
            <span className="flex items-center gap-2"><Mail size={14} style={{ color: theme.accentColor }}/> {general.email}</span>
            <span className="flex items-center gap-2"><Phone size={14} style={{ color: theme.accentColor }}/> {general.phone}</span>
          </div>
        </div>

        {general.img && (
          <img 
            src={general.img} 
            alt="Profile" 
            className="w-28 h-28 rounded-3xl object-cover border-4 shadow-2xl z-10" 
            style={{ borderColor: theme.accentColor }} 
          />
        )}
      </header>

      {/* On force le flex-row même à l'impression pour éviter l'empilement */}
      <div className="flex flex-row gap-10 flex-1 print:flex-row">
        
        {/* COLONNE GAUCHE (ASIDE) - Largeur fixe pour la structure */}
        <aside className="w-[240px] space-y-8 print:w-[240px]">
          
          {/* COMPÉTENCES AVEC STYLE "TECH BADGE" */}
          <section className="p-6 rounded-[32px] bg-slate-50 border border-slate-100 space-y-5">
            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-800">
              <Code size={16} style={{ color: theme.accentColor }} /> Stack Technique
            </h3>
            <div className="flex flex-wrap gap-2">
              {skills.map(s => (
                <span key={s.id} className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 shadow-sm">
                  {s.competence || s.nom}
                </span>
              ))}
            </div>
          </section>

          {/* LANGUES */}
          {langue.length > 0 && (
            <section className="px-6 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Communication</h3>
              <div className="space-y-3">
                {langue.map(l => (
                  <div key={l.id} className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">{l.langue || l.nom}</span>
                    <div className="h-1.5 w-12 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full w-full" style={{ backgroundColor: theme.accentColor }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Loisirs */}
           {hobbi.length > 0 && (
              <section className="p-6 rounded-[32px] bg-slate-50 border border-slate-100 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Hobbies
                </h3>
                <div className="flex flex-wrap gap-2">
                  {hobbi.map((h) => (
                    <span 
                      key={h.id} 
                      className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 shadow-sm transition-all hover:border-slate-300"
                    >
                      {h.loisir}
                    </span>
                  ))}
                </div>
              </section>
            )}

        </aside>

        {/* COLONNE DROITE (MAIN) - Prend le reste de la place */}
        <main className="flex-1 space-y-10">
          
          {/* RÉSUMÉ */}
          <section className="relative">
             <div className="absolute -left-4 top-0 bottom-0 w-1 rounded-full" style={{ backgroundColor: theme.accentColor }}></div>
             <p className="text-[14px] text-slate-600 leading-relaxed font-medium">
               {general.summary || "Passionné par la résolution de problèmes complexes et l'architecture logicielle..."}
             </p>
          </section>

          {/* EXPÉRIENCES */}
          <section className="space-y-6">
            <h2 className="text-sm font-black uppercase tracking-[5px] flex items-center gap-3 text-slate-900">
              <Briefcase size={18} style={{ color: theme.accentColor }} /> Parcours_Pro
            </h2>
            <div className="space-y-6">
              {experience.map(exp => (
                <div key={exp.id} className="group relative p-5 rounded-3xl border border-transparent hover:border-slate-100 hover:bg-slate-50/50 transition-all">
                  <div className="flex justify-between items-baseline mb-2">
                    <h4 className="font-black text-slate-900 text-[15px] uppercase">{exp.position}</h4>
                    <span className="text-[10px] font-mono font-bold text-slate-500">
                      {exp.start} // {exp.end}
                    </span>
                  </div>
                  <p className="text-[12px] font-bold mb-3" style={{ color: theme.accentColor }}>{exp.company}</p>
                  <p className="text-[12px] text-slate-500 leading-relaxed">{exp.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FORMATION */}
          <section className="space-y-6">
            <h2 className="text-sm font-black uppercase tracking-[5px] flex items-center gap-3 text-slate-900">
              <GraduationCap size={18} style={{ color: theme.accentColor }} /> Diplômes_&_Cursus
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {education.map(edu => (
                <div key={edu.id} className="flex gap-4 items-start pl-2">
                  <div className="mt-1 w-2 h-2 rounded-full" style={{ backgroundColor: theme.accentColor }}></div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-[14px]">{edu.school}</h4>
                    <p className="text-[12px] font-semibold opacity-70" style={{ color: theme.accentColor }}>{edu.title}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-1">{edu.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </main>
      </div>

    </div>
  );
};

export default TechTemplate;