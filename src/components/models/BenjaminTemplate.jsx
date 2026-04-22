// src/components/templates/BenjaminTemplate.jsx
import { User, Mail, Phone, MapPin, CalendarDays, Zap, Languages } from 'lucide-react';

const BenjaminTemplate = ({ data }) => {
  const { general, education, experience, skills, langue, hobbi, theme } = data;

  // Configuration par défaut si les données sont absentes
  const fallbackEmail = "email@exemple.com";
  const fallbackPhone = "01 23 45 67 89";
  const fallbackLocation = "Ville, Pays";

  return (
    <div className="w-full flex min-h-[297mm] bg-white text-[#333] font-sans print:w-[210mm] print:min-h-[297mm]">
      {/* Le conteneur principal : Flex pour séparer la sidebar du contenu principal.
        On s'assure que la largeur est bien de 210mm à l'impression.
      */}
      <div className="flex w-full min-h-full border-l border-slate-100">
        
        {/* --- SIDEBAR GAUCHE (environ 30%) --- */}
        <aside className="w-[35%] bg-white border-r border-slate-100 p-8 flex flex-col gap-10 print:w-[30%]">
          
          {/* Header : Nom & Titre */}
          <div className="space-y-3">
            <h1 className="text-[32px] leading-tight font-light uppercase tracking-[4px] text-slate-900">
              {general.name ? general.name.split(' ')[0] : "PRÉNOM"}
            </h1>
            <h1 className="text-[32px] leading-tight font-extrabold uppercase tracking-[4px] text-slate-950 -mt-2">
              {general.name ? general.name.split(' ').slice(1).join(' ') : "NOM"}
            </h1>
            <p className="text-[11px] font-semibold uppercase tracking-[2px]" style={{ color: theme.accentColor }}>
              {general.title || "VOTRE TITRE DE POSTE"}
            </p>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h2 className="font-bold text-[14px] uppercase tracking-[2px] text-slate-950 mb-4">
              Contact
            </h2>
            <div className="space-y-3.5 text-slate-700 text-[12px]">
              <div className="flex items-center gap-3">
                <Mail size={16} style={{ color: theme.accentColor }} />
                <span className="break-all">{general.email || fallbackEmail}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} style={{ color: theme.accentColor }} />
                <span>{general.phone || fallbackPhone}</span>
              </div>
              {/* Note: Ta structure GeneralInfo ne contient pas 'ville', on met un placeholder */}
              <div className="flex items-center gap-3">
                <MapPin size={16} style={{ color: theme.accentColor }} />
                <span>{fallbackLocation}</span>
              </div>
            </div>
          </div>

          {/* Formation */}
          <div className="space-y-4 pt-4">
            <h2 className="font-bold text-[14px] uppercase tracking-[2px] text-slate-950 mb-4">
              Formation
            </h2>
            {education.length > 0 ? education.map(edu => (
              <div key={edu.id} className="space-y-1">
                <h3 className="font-semibold text-[13px] text-slate-900">{edu.title}</h3>
                <p className="text-[12px] text-slate-700 italic">{edu.school}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                  <CalendarDays size={14} />
                  <span>{edu.date}</span>
                </div>
              </div>
            )) : (
              <p className="text-slate-400 italic text-[12px]">Aucune formation ajoutée.</p>
            )}
          </div>

          {/* Compétences */}
          {skills.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h2 className="font-bold text-[14px] uppercase tracking-[2px] text-slate-950 mb-4">
                Compétences
              </h2>
              <div className="flex flex-col gap-2.5">
                {skills.map(skill => (
                  <div key={skill.id} className="flex items-center gap-2.5 text-[12px] text-slate-700">
                    <Zap size={14} style={{ color: theme.accentColor }} />
                    <span className="font-medium">{skill.nom || skill.competence}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Langues */}
          {langue.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <h2 className="font-bold text-[14px] uppercase tracking-[2px] text-slate-950 mb-4">
                Langues
              </h2>
              <div className="flex flex-col gap-2.5">
                {langue.map(l => (
                  <div key={l.id} className="flex items-center gap-2.5 text-[12px] text-slate-700">
                    <Languages size={14} style={{ color: theme.accentColor }} />
                    <span className="font-medium uppercase tracking-wider">{l.nom || l.langue}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </aside>

        {/* --- CONTENU PRINCIPAL (environ 70%) --- */}
        <main className="w-[65%] p-10 bg-white flex flex-col gap-10 print:w-[70%]">
          
          {/* Section Profil (Résumé) */}
          <section className="relative">
            {/* Image de profil positionnée en haut à droite, comme dans Benjamin Leroy */}
            {general.img && (
              <img 
                src={general.img} 
                alt="Profile" 
                className="absolute -top-9 right-0 w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl z-10"
              />
            )}
            
            <div className="pt-15"> {/* Espace pour l'image si elle est présente */}
              <h2 className="text-[20px] font-bold uppercase tracking-[3px] text-slate-950 mb-5 border-b-2 pb-2" style={{ borderBottomColor: theme.accentColor }}>
                Profil
              </h2>
              <p className="text-[13px] text-slate-700 leading-relaxed text-justify italic">
                {general.summary || "Expliquez ici votre expertise et vos objectifs professionnels. Décrivez ce que vous apportez à une entreprise en quelques phrases percutantes."}
              </p>
            </div>
          </section>

          {/* Section Expériences Professionnelles */}
          <section>
            <h2 className="text-[20px] font-bold uppercase tracking-[3px] text-slate-950 mb-5 border-b-2 pb-2" style={{ borderBottomColor: theme.accentColor }}>
              Expériences Professionnelles
            </h2>
            
            <div className="space-y-7">
              {experience.length > 0 ? experience.map(exp => (
                <div key={exp.id} className="relative pl-6 border-l-2 border-slate-100 hover:border-blue-100 transition-colors">
                  {/* Point sur la ligne du temps */}
                  <div className="absolute top-1 -left-[9px] w-4 h-4 rounded-full bg-white border-2 border-slate-200" style={{ borderColor: theme.accentColor }} />
                  
                  <div className="space-y-2">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-[15px] font-bold text-slate-950 uppercase">{exp.position}</h3>
                      <p className="text-[13px] font-semibold text-slate-700">{exp.company}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                        <CalendarDays size={14} />
                        <span className="uppercase">{exp.start} - {exp.end}</span>
                      </div>
                    </div>
                    
                    <p className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-line">
                      {exp.desc || "Description de vos missions et réalisations."}
                    </p>
                  </div>
                </div>
              )) : (
                <p className="text-slate-400 italic text-[12px]">Aucune expérience ajoutée.</p>
              )}
            </div>
          </section>

        </main>
      </div>
    </div>
  );
};

export default BenjaminTemplate;