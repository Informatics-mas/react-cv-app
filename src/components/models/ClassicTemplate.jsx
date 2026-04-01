// src/components/templates/ClassicTemplate.jsx
import { Mail, Phone, MapPin, Globe } from 'lucide-react';

const ClassicTemplate = ({ data }) => {
  const { general, education, experience, skills, langue, hobbi, theme } = data;

  return (
    <div className="w-full min-h-[842px] bg-white p-12 text-slate-800">
      {/* HEADER CENTRÉ */}
      <header className="text-center space-y-4 mb-10 border-b-4 pb-8" style={{ borderColor: theme.accentColor }}>
        <div className="space-y-1">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">
            {general.name || "Votre Nom"}
          </h1>
          <p className="text-xl font-bold uppercase tracking-[4px]" style={{ color: theme.accentColor }}>
            {general.title || "Titre du Poste"}
          </p>
        </div>

        {/* CONTACT INFO HORIZONTAL */}
        <div className="flex justify-center flex-wrap gap-6 text-[11px] font-bold text-slate-500 uppercase">
          <span className="flex items-center gap-1"><Mail size={12} style={{ color: theme.accentColor }} /> {general.email}</span>
          <span className="flex items-center gap-1"><Phone size={12} style={{ color: theme.accentColor }} /> {general.phone}</span>
          {/* Tu peux ajouter la ville ici si tu l'as dans ton state */}
        </div>
      </header>

      <div className="grid grid-cols-3 gap-10">
        {/* COLONNE GAUCHE : SKILLS, LANGUES, LOISIRS */}
        <div className="col-span-1 space-y-8">
          {/* PROFIL (DÉPLACÉ ICI POUR LE STYLE) */}
          <section>
            <h3 className="text-sm font-black uppercase mb-3 border-b border-slate-200 pb-1" style={{ color: theme.accentColor }}>
              Profil
            </h3>
            <p className="text-[11px] text-slate-600 leading-relaxed text-justify italic">
              {general.summary}
            </p>
          </section>

          {/* COMPÉTENCES */}
          {skills.length > 0 && (
            <section>
              <h3 className="text-sm font-black uppercase mb-3 border-b border-slate-200 pb-1" style={{ color: theme.accentColor }}>
                Expertise
              </h3>
              <div className="flex flex-col gap-2">
                {skills.map(s => (
                  <div key={s.id} className="text-[11px] font-bold text-slate-700 uppercase flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }}></span>
                    {s.competence}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* LANGUES */}
          {langue.length > 0 && (
            <section>
              <h3 className="text-sm font-black uppercase mb-3 border-b border-slate-200 pb-1" style={{ color: theme.accentColor }}>
                Langues
              </h3>
              {langue.map(l => (
                <p key={l.id} className="text-[11px] font-bold text-slate-600 uppercase">{l.langue}</p>
              ))}
            </section>
          )}
        </div>

        {/* COLONNE DROITE : EXPÉRIENCES & FORMATION */}
        <div className="col-span-2 space-y-8">
          
          {/* EXPÉRIENCES */}
          <section>
            <h3 className="text-sm font-black uppercase mb-4 flex items-center gap-2">
              <span className="w-8 h-[2px]" style={{ backgroundColor: theme.accentColor }}></span>
              Expériences Professionnelles
            </h3>
            <div className="space-y-6">
              {experience.map(exp => (
                <div key={exp.id} className="relative">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-bold text-sm uppercase text-slate-900">{exp.position}</h4>
                    <span className="text-[10px] font-black text-slate-400">{exp.start} — {exp.end}</span>
                  </div>
                  <p className="text-[11px] font-bold mb-2" style={{ color: theme.accentColor }}>{exp.company}</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{exp.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FORMATION */}
          <section>
            <h3 className="text-sm font-black uppercase mb-4 flex items-center gap-2">
              <span className="w-8 h-[2px]" style={{ backgroundColor: theme.accentColor }}></span>
              Parcours Académique
            </h3>
            <div className="space-y-4">
              {education.map(edu => (
                <div key={edu.id}>
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-bold text-[12px] uppercase text-slate-900">{edu.school}</h4>
                    <span className="text-[10px] font-bold text-slate-400">{edu.date}</span>
                  </div>
                  <p className="text-[11px] italic text-slate-600">{edu.title}</p>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default ClassicTemplate;