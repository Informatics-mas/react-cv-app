// src/components/templates/ModernTemplate.jsx
import { User, Mail, Phone } from 'lucide-react';

const ModernTemplate = ({ data }) => {
  // On extrait les données pour plus de clarté
  const { general, education, experience, skills, langue, hobbi, theme } = data;

  return (
    <div className="w-full flex flex-col md:flex-row min-h-[842px] bg-white">
      {/* Sidebar */}
      <aside 
        className="w-full md:w-64 rounded-tr-[45px] rounded-br-[45px] text-white p-8 space-y-6" 
        style={{ backgroundColor: theme.sidebarBg }}
      >
        <div className="text-center space-y-4">
          {general.img ? (
            <img src={general.img} className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-white/20 shadow-lg" alt="Profile" />
          ) : (
            <div className="w-32 h-32 rounded-full bg-white/10 mx-auto flex items-center justify-center border-4 border-white/20">
              <User size={48} className="text-white/40" />
            </div>
          )}
          <div className="space-y-1">
            <h1 className="text-xl font-bold uppercase tracking-wide">{general.name || "Votre Nom"}</h1>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.accentColor }}>
              {general.title || "Titre du Poste"}
            </p>
          </div>
        </div>

        {/* Contact */}
        <div className="pt-6 border-t border-white/10 space-y-3">
          <p className="text-[12px] break-all flex flex-col uppercase tracking-tighter text-white/60">
            <span className="text-white text-[14px] font-bold mb-1">Email</span>
            {general.email || "email@exemple.com"}
          </p>
          <p className="text-[12px] flex flex-col uppercase tracking-tighter text-white/60">
            <span className="text-white text-[14px] font-bold mb-1">Téléphone</span>
            {general.phone || "01 23 45 67 89"}
          </p>
        </div>

        {/* Langues */}
        {langue.length > 0 && (
          <div className="space-y-2 pt-4">
            <h3 className="font-bold text-[14px] uppercase tracking-widest" style={{ color: theme.accentColor }}>Langues</h3>
            {langue.map(l => (
              <p key={l.id} className="text-[12px] text-white/80 uppercase">{l.nom || l.langue}</p>
            ))}
          </div>
        )}

        {/* Compétences */}
        {skills.length > 0 && (
          <div className="pt-6 border-t border-white/10 space-y-3">
            <h3 className="font-bold text-[14px] uppercase tracking-[2px]" style={{ color: theme.accentColor }}>
              Compétences
            </h3>
            <div className="flex flex-col gap-2">
              {skills.map((skill) => (
                <span key={skill.id} className="text-[12px] font-medium text-white/90 uppercase tracking-wider">
                  {skill.nom || skill.competence || "Compétence"}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Loisirs */}
        {hobbi.length > 0 && (
          <div className="space-y-2 pt-4">
            <h3 className="font-bold text-[14px] uppercase tracking-widest text-emerald-400">Loisirs</h3>
            <div className="flex flex-wrap gap-2">
              {hobbi.map(h => (
                <span key={h.id} className="text-[11px] bg-white/10 px-2 py-1 rounded border border-white/5 text-white/80">
                  {h.loisir}
                </span>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 bg-white">
        <div className="space-y-8">
          {/* Profil */}
          <section>
            <h3 
              className="text-[22px] font-bold border-b-2 pb-2 mb-3 uppercase tracking-[3px]"
              style={{ color: '#1e293b', borderBottomColor: theme.accentColor }}
            >
              Profil
            </h3>
            <p className="text-[14px] text-slate-600 leading-relaxed text-justify italic">
              {general.summary || "Expliquez ici votre expertise..."}
            </p>
          </section>

          {/* Éducation */}
          <section>
            <h3 
              className="text-[22px] font-bold border-b-2 pb-2 mb-4 uppercase tracking-[3px]"
              style={{ color: '#1e293b', borderBottomColor: theme.accentColor }}
            >
              Formation
            </h3>
            {education.length > 0 ? education.map(edu => (
              <div key={edu.id} className="mb-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-[16px] text-slate-900 uppercase">{edu.school}</h4>
                  <span className="text-[12px] bg-slate-100 px-2 py-1 rounded font-bold">{edu.date}</span>
                </div>
                <p className="text-[14px] font-medium italic" style={{ color: theme.accentColor }}>{edu.title}</p>
              </div>
            )) : (
              <p className="text-slate-300 italic text-[12px]">Aucune formation ajoutée.</p>
            )}
          </section>

          {/* Expériences */}
          <section>
            <h3 
              className="text-[22px] font-bold border-b-2 pb-2 mb-4 uppercase tracking-[3px]"
              style={{ color: '#1e293b', borderBottomColor: theme.accentColor }}
            >
              Expériences
            </h3>
            {experience.length > 0 ? experience.map(exp => (
              <div key={exp.id} className="mb-6 relative pl-4 border-l-2 border-slate-100">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-bold text-[16px] text-slate-900 uppercase">{exp.position}</h4>
                  <span className="text-[12px] font-bold text-slate-400 uppercase">{exp.start} - {exp.end}</span>
                </div>
                <p className="text-[14px] font-bold text-slate-600 mb-1">{exp.company}</p>
                <p className="text-[12px] text-slate-500 leading-relaxed">{exp.desc}</p>
              </div>
            )) : (
              <p className="text-slate-300 italic text-[12px]">Aucune expérience ajoutée.</p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default ModernTemplate;