// src/components/templates/MetroTemplate.jsx
import { Mail, Phone, MapPin, Briefcase, GraduationCap, Code, Languages, Heart, User } from 'lucide-react';

const MetroTemplate = ({ data }) => {
  const { general, education, experience, skills, langue, hobbi, theme } = data;

  // Grille de couleurs pour les tuiles (tiles) basée sur l'accentColor
  // On génère des variations pour créer l'effet "Metro"
  const tileColors = [
    theme.accentColor, // Couleur principale
    '#1e293b',         // Ardoise foncé (sidebarBg habituel)
    `${theme.accentColor}dd`, // Accent semi-transparent
    '#0f172a',         // Presque noir
    `${theme.accentColor}aa`, // Accent plus transparent
  ];

  return (
    <div className="w-full min-h-[842px] bg-[#f1f5f9] p-6 font-sans text-slate-900">
      
      {/* GRILLE PRINCIPALE METRO */}
      <div className="grid grid-cols-4 gap-4 auto-rows-[minmax(100px,_auto)]">
        
        {/* TUILE PHOTO & NOM (GRANDE - 3x2) */}
        <div className="col-span-3 row-span-2 p-8 flex items-center gap-8 text-white shadow-lg" style={{ backgroundColor: theme.accentColor }}>
          {general.img && (
            <img src={general.img} alt="Profile" className="w-40 h-40 object-cover border-4 border-white/50" />
          )}
          <div className="space-y-2 flex-1">
            <h1 className="text-5xl font-extrabold uppercase tracking-tighter leading-none">
              {general.name || "Votre Nom"}
            </h1>
            <p className="text-xl font-light uppercase tracking-[3px] opacity-90">
              {general.title || "Titre du Poste"}
            </p>
          </div>
        </div>

        {/* TUILE CONTACT (1x2) */}
        <div className="col-span-1 row-span-2 bg-white p-6 flex flex-col justify-center gap-4 border-t-4 shadow-md" style={{ borderColor: theme.accentColor }}>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Contact</h3>
          <div className="flex items-center gap-3 text-sm border-b border-slate-100 pb-3">
            <Mail size={18} className="shrink-0" style={{ color: theme.accentColor }} />
            <span className="break-all text-xs font-medium text-slate-700">{general.email || "email@exemple.com"}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Phone size={18} className="shrink-0" style={{ color: theme.accentColor }} />
            <span className="text-xs font-medium text-slate-700">{general.phone || "01 23 45 67 89"}</span>
          </div>
        </div>

        {/* TUILE PROFIL (2x1) */}
        <div className="col-span-2 bg-[#1e293b] p-6 text-white/90 shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <User size={20} style={{ color: theme.accentColor }} />
            <h3 className="text-sm font-black uppercase tracking-widest">Profil</h3>
          </div>
          <p className="text-[11px] leading-relaxed italic font-light text-justify">
            {general.summary || "Votre accroche professionnelle..."}
          </p>
        </div>

        {/* TUILES COMPÉTENCES (1x1 chacune) */}
        {skills.slice(0, 2).map((skill, index) => (
          <div key={skill.id} className="col-span-1 p-5 text-white shadow-lg flex flex-col justify-between" style={{ backgroundColor: tileColors[index + 2] }}>
            <Code size={20} className="opacity-60" />
            <span className="text-xs font-bold uppercase tracking-wide leading-tight mt-2">
              {skill.competence || skill.nom}
            </span>
          </div>
        ))}

        {/* SECTION PRINCIPALE (EXPÉRIENCES + FORMATION) - 3xAUTO */}
        <div className="col-span-3 space-y-4">
          
          {/* EXPÉRIENCES */}
          <div className="bg-white p-6 shadow-md border-l-4" style={{ borderLeftColor: theme.accentColor }}>
            <div className="flex items-center gap-3 mb-6">
              <Briefcase size={22} style={{ color: theme.accentColor }} />
              <h2 className="text-xl font-extrabold uppercase tracking-tight text-slate-900">Parcours Professionnel</h2>
            </div>
            <div className="space-y-6">
              {experience.map(exp => (
                <div key={exp.id} className="grid grid-cols-5 gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                  <div className="col-span-1 text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-1 rounded">
                      {exp.start} — {exp.end}
                    </span>
                  </div>
                  <div className="col-span-4 space-y-1">
                    <h4 className="font-bold text-sm uppercase text-slate-900">{exp.position}</h4>
                    <p className="text-[11px] font-bold" style={{ color: theme.accentColor }}>{exp.company}</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed pt-1">{exp.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FORMATION */}
          <div className="bg-white p-6 shadow-md border-l-4" style={{ borderLeftColor: theme.accentColor }}>
            <div className="flex items-center gap-3 mb-6">
              <GraduationCap size={22} style={{ color: theme.accentColor }} />
              <h2 className="text-xl font-extrabold uppercase tracking-tight text-slate-900">Formation Académique</h2>
            </div>
            <div className="space-y-4">
              {education.map(edu => (
                <div key={edu.id} className="flex justify-between items-start gap-4">
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-[12px] uppercase text-slate-900">{edu.school}</h4>
                    <p className="text-[11px] italic text-slate-600">{edu.title}</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 shrink-0 mt-1">{edu.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLONNE DROITE : LANGUES & LOISIRS (1xAUTO) */}
        <div className="col-span-1 space-y-4">
          
          {/* LANGUES */}
          {langue.length > 0 && (
            <div className="bg-[#1e293b] p-6 text-white shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <Languages size={18} style={{ color: theme.accentColor }} />
                <h3 className="text-xs font-black uppercase tracking-widest">Langues</h3>
              </div>
              <div className="space-y-2">
                {langue.map(l => (
                  <p key={l.id} className="text-[11px] font-bold uppercase tracking-wide border-b border-white/10 pb-1.5 last:border-0">
                    {l.langue || l.nom}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* LOISIRS */}
          {hobbi.length > 0 && (
            <div className="bg-white p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <Heart size={18} style={{ color: theme.accentColor }} />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Loisirs</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {hobbi.map(h => (
                  <span key={h.id} className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded uppercase">
                    {h.loisir}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default MetroTemplate;