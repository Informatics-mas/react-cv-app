import React from 'react';
import { User, Briefcase, Settings, GraduationCap, Mail, Phone, MapPin } from 'lucide-react';

const ClassicGreyTemplate = ({ data }) => {
  const { general, education, experience, skills, hobbi, theme } = data;

  const fallbackEmail = "marie.bernard@mail.com";
  const fallbackPhone = "06 12 34 56 78";
  const fallbackLocation = "2 rue de la République, 68000, Colmar";

  return (
    <div className="w-full flex min-h-[297mm] bg-white text-[#333] font-sans print:w-[210mm] print:min-h-[297mm] shadow-lg">
      
      {/* --- SIDEBAR GAUCHE (Grise) --- */}
      <aside className="w-[35%] bg-[#d9d9d9] pt-12 pb-8 px-6 flex flex-col gap-8 print:w-[32%]">
        
        {/* Photo de profil */}
        <div className="flex justify-center">
          {general.img ? (
            <img 
              src={general.img} 
              alt="Profil" 
              className="w-40 h-40 rounded-full object-cover border-[6px] border-black/10"
            />
          ) : (
            <div className="w-40 h-40 rounded-full bg-slate-300 border-[6px] border-black/10 flex items-center justify-center">
              <User size={40} className="text-slate-500" />
            </div>
          )}
        </div>

        {/* Coordonnées */}
        <div className="border-y-2 border-dotted border-slate-400 py-6 mt-4">
          <h2 className="font-bold text-[14px] uppercase tracking-widest text-black mb-4">
            Coordonnées
          </h2>
          <div className="space-y-4 text-[11px] text-black">
            <div className="flex items-start gap-3">
              <MapPin size={14} className="mt-0.5 shrink-0" />
              <span>{general.location || fallbackLocation}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={14} className="shrink-0" />
              <span>{general.phone || fallbackPhone}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={14} className="shrink-0" />
              <span className="break-all">{general.email || fallbackEmail}</span>
            </div>
          </div>
        </div>

        {/* Centres d'intérêt */}
        {hobbi && hobbi.length > 0 && (
          <div className="border-b-2 border-dotted border-slate-400 pb-6">
            <h2 className="font-bold text-[14px] uppercase tracking-widest text-black mb-4">
              Centres d'intérêt
            </h2>
            <ul className="list-disc list-inside space-y-2 text-[11px] text-black">
              {hobbi.map(h => (
                <li key={h.id}>{h.nom || h.hobby}</li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {/* --- CONTENU PRINCIPAL --- */}
      <main className="w-[65%] py-12 px-8 flex flex-col gap-6 print:w-[68%]">
        
        {/* En-tête : Nom */}
        <div className="mb-2">
          <h1 className="text-[36px] font-black uppercase text-black leading-none tracking-wide">
            {general.name || "MARIE BERNARD"}
          </h1>
        </div>

        {/* Profil Professionnel */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-black text-white p-1 rounded-full"><User size={14} /></div>
            <h2 className="text-[14px] font-bold uppercase tracking-widest text-black">Profil Professionnel</h2>
          </div>
          <p className="text-[11px] text-slate-700 leading-relaxed pl-7">
            {general.summary || "Secrétaire efficace sachant entretenir des relations professionnelles cordiales avec les clients, le personnel et les associés. Bon esprit d'équipe, concentrée et d'un grand soutien, avec une approche proactive de l'administration."}
          </p>
        </section>

        {/* Parcours Professionnel */}
        <section>
          <div className="flex items-center gap-2 mb-3 mt-2">
            <div className="bg-black text-white p-1 rounded-full"><Briefcase size={14} /></div>
            <h2 className="text-[14px] font-bold uppercase tracking-widest text-black">Parcours Professionnel</h2>
          </div>
          <div className="pl-7 space-y-5">
            {experience.length > 0 ? experience.map(exp => (
              <div key={exp.id}>
                <div className="text-[10px] text-slate-500 mb-0.5">{exp.start} - {exp.end}</div>
                <div className="text-[12px] font-bold text-black mb-2">
                  {exp.position}, <span className="font-normal italic">{exp.company}</span>
                </div>
                <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line">
                  {exp.desc}
                </p>
              </div>
            )) : (
              <p className="text-[11px] text-slate-400">Aucune expérience ajoutée.</p>
            )}
          </div>
        </section>

        {/* Compétences */}
        {skills.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3 mt-2">
              <div className="bg-black text-white p-1 rounded-full"><Settings size={14} /></div>
              <h2 className="text-[14px] font-bold uppercase tracking-widest text-black">Compétences</h2>
            </div>
            <ul className="pl-7 grid grid-cols-2 gap-2 text-[11px] text-slate-700 list-disc list-inside">
              {skills.map(skill => (
                <li key={skill.id}>{skill.nom || skill.competence}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Formation */}
        <section>
          <div className="flex items-center gap-2 mb-3 mt-2">
            <div className="bg-black text-white p-1 rounded-full"><GraduationCap size={14} /></div>
            <h2 className="text-[14px] font-bold uppercase tracking-widest text-black">Formation</h2>
          </div>
          <div className="pl-7 space-y-4">
            {education.length > 0 ? education.map(edu => (
              <div key={edu.id}>
                <div className="text-[10px] text-slate-500 mb-0.5">{edu.date}</div>
                <div className="text-[12px] font-bold text-black">{edu.title}</div>
                <div className="text-[11px] text-slate-700">{edu.school}</div>
              </div>
            )) : (
              <p className="text-[11px] text-slate-400">Aucune formation ajoutée.</p>
            )}
          </div>
        </section>

      </main>
    </div>
  );
};

export default ClassicGreyTemplate;