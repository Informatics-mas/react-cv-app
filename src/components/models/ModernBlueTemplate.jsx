import React from 'react';

const ModernBlueTemplate = ({ data }) => {
  const { general, education, experience, skills, hobbi, theme } = data;

  const fallbackEmail = "marie.bernard@mail.com";
  const fallbackPhone = "06 12 34 56 78";
  const fallbackLocation = "2 rue de la République\n68000, Colmar";
  
  // Utilisation de la couleur d'accentuation définie dans le thème, sinon le bleu de l'image
  const accentColor = theme?.accentColor || "#80A9D4"; 

  // Séparation du prénom et du nom pour le style bicolore
  const nameParts = general.name ? general.name.split(' ') : ["MARIE", "BERNARD"];
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  return (
    <div className="w-full flex min-h-[297mm] bg-white text-[#333] font-sans print:w-[210mm] print:min-h-[297mm] shadow-lg">
      
      {/* --- SIDEBAR GAUCHE (Bleue) --- */}
      <aside className="w-[32%] pt-16 pb-8 px-8 flex flex-col gap-10 print:w-[30%]" style={{ backgroundColor: accentColor }}>
        
        {/* Photo de profil avec bordure blanche épaisse */}
        <div className="flex justify-center">
          {general.img ? (
            <img 
              src={general.img} 
              alt="Profil" 
              className="w-40 h-40 rounded-full object-cover border-[8px] border-white shadow-sm"
            />
          ) : (
            <div className="w-40 h-40 rounded-full bg-white/20 border-[8px] border-white flex items-center justify-center">
              <span className="text-white text-4xl">{firstName.charAt(0)}</span>
            </div>
          )}
        </div>

        {/* Coordonnées */}
        <div>
          <h2 className="font-bold text-[14px] text-black mb-3">Coordonnées</h2>
          <div className="space-y-3 text-[11px] text-black leading-relaxed">
            <p className="whitespace-pre-line">{general.location || fallbackLocation}</p>
            <p>{general.phone || fallbackPhone}</p>
            <p className="break-all">{general.email || fallbackEmail}</p>
          </div>
        </div>

        {/* Compétences */}
        {skills.length > 0 && (
          <div>
            <h2 className="font-bold text-[14px] text-black mb-3">Compétences</h2>
            <ul className="space-y-2 text-[11px] text-black list-disc list-inside">
              {skills.map(skill => (
                <li key={skill.id}>{skill.nom || skill.competence}</li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {/* --- CONTENU PRINCIPAL --- */}
      <main className="w-[68%] py-16 px-10 flex flex-col gap-8 print:w-[70%]">
        
        {/* En-tête : Nom Bicolore avec Serif + Ruban bleu */}
        <div className="mb-4 relative">
          <h1 className="text-[48px] font-serif leading-[1.1] uppercase tracking-wide">
            <span style={{ color: accentColor }}>{firstName}</span><br />
            <span className="text-black">{lastName}</span>
          </h1>
          {/* Forme géométrique bleue sous le nom (reproduisant le design de l'image) */}
          <div 
            className="absolute -bottom-2 right-0 h-4 w-48 opacity-80" 
            style={{ 
              backgroundColor: accentColor,
              clipPath: 'polygon(10% 0, 100% 0, 100% 100%, 0% 100%)' 
            }}
          />
        </div>

        {/* Profil professionnel */}
        <section>
          <h2 className="text-[16px] font-bold text-black mb-3">Profil professionnel</h2>
          <p className="text-[11px] text-slate-700 leading-relaxed text-justify">
            {general.summary || "Secrétaire efficace sachant entretenir des relations professionnelles cordiales avec les clients, le personnel et les associés. Bon esprit d'équipe, concentrée et d'un grand soutien, avec une approche proactive de l'administration et une grande attention aux détails."}
          </p>
        </section>

        {/* Parcours professionnel */}
        <section>
          <h2 className="text-[16px] font-bold text-black mb-4">Parcours professionnel</h2>
          <div className="space-y-6">
            {experience.length > 0 ? experience.map(exp => (
              <div key={exp.id}>
                <h3 className="text-[13px] font-bold text-black mb-1">{exp.position}</h3>
                <div className="text-[11px] text-slate-500 mb-2">
                  {exp.company} | {exp.start} - {exp.end}
                </div>
                <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-line pl-3 border-l-2 border-slate-200">
                  {exp.desc}
                </p>
              </div>
            )) : (
              <p className="text-[11px] text-slate-400">Aucune expérience ajoutée.</p>
            )}
          </div>
        </section>

        {/* Formation */}
        <section>
          <h2 className="text-[16px] font-bold text-black mb-4">Formation</h2>
          <div className="space-y-4">
            {education.length > 0 ? education.map(edu => (
              <div key={edu.id}>
                <div className="text-[12px] font-bold text-black">{edu.school}</div>
                <div className="text-[11px] text-slate-700">{edu.title}</div>
                <div className="text-[11px] text-slate-500 mt-1">{edu.date}</div>
              </div>
            )) : (
              <p className="text-[11px] text-slate-400">Aucune formation ajoutée.</p>
            )}
          </div>
        </section>

        {/* Centres d'intérêt */}
        {hobbi && hobbi.length > 0 && (
          <section>
            <h2 className="text-[16px] font-bold text-black mb-3">Centres d'intérêt</h2>
            <ul className="text-[11px] text-slate-700 space-y-1 list-disc list-inside">
              {hobbi.map(h => (
                <li key={h.id}>{h.nom || h.hobby}</li>
              ))}
            </ul>
          </section>
        )}

      </main>
    </div>
  );
};

export default ModernBlueTemplate;