const ClassicBlueTemplate = ({ data }) => {
  const { general, education, experience, skills, langue, hobbi } = data;

  const BadgeTitle = ({ children }) => (
    <h3 className="bg-[#3b4b8a] text-white px-4 py-1.5 rounded-full text-[14px] font-bold uppercase mb-4 tracking-wider">
      {children}
    </h3>
  );

  return (
    <div className="w-full flex flex-row min-h-[297mm] bg-white text-slate-900" style={{ width: '210mm' }}>
      <aside className="w-[35%] p-8 border-r border-slate-100 flex flex-col gap-6">
        <div className="text-center mb-4">
          <img src={general.img} className="w-32 h-32 rounded-full mx-auto border-4 border-[#3b4b8a] p-1 object-cover" alt="Profile" />
          <h1 className="mt-4 text-2xl font-black text-[#3b4b8a] uppercase leading-tight">{general.name} {general.lastName}</h1>
          <p className="text-[12px] font-bold text-slate-500 uppercase">{general.title}</p>
        </div>

        <section>
          <BadgeTitle>Contact</BadgeTitle>
          <div className="space-y-2 text-[11px] font-medium text-slate-600">
            <p>Tel: {general.phone}</p>
            <p>Email: {general.email}</p>
          </div>
        </section>

        <section>
          <BadgeTitle>Langues</BadgeTitle>
          <div className="text-[11px] text-slate-600">
            {langue.map(l => (
              <p key={l.id}><strong>{l.langue}</strong></p>
            ))}
          </div>
        </section>

        <section>
          <BadgeTitle>Loisirs</BadgeTitle>
          <p className="text-[11px] text-slate-600">
            {hobbi.map(h => h.loisir).join(', ')}
          </p>
        </section>
      </aside>

      <main className="w-[65%] p-10 space-y-10">
        <section>
          <BadgeTitle>Profil</BadgeTitle>
          <p className="text-[12px] text-slate-600 leading-relaxed italic">{general.summary}</p>
        </section>

        <section>
          <BadgeTitle>Expérience</BadgeTitle>
          {experience.map(exp => (
            <div key={exp.id} className="mb-5">
              <h4 className="font-bold text-[13px] uppercase">{exp.position}</h4>
              <p className="text-[11px] text-slate-500">{exp.company} | {exp.start} - {exp.end}</p>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">{exp.desc}</p>
            </div>
          ))}
        </section>

        <section>
          <BadgeTitle>Formation</BadgeTitle>
          {education.map(edu => (
            <div key={edu.id} className="mb-4">
              <h4 className="font-bold text-[13px] uppercase">{edu.school}</h4>
              <p className="text-[11px] text-slate-600">{edu.title} ({edu.date})</p>
            </div>
          ))}
        </section>

        <section>
          <BadgeTitle>Compétences</BadgeTitle>
          <div className="grid grid-cols-2 gap-y-2">
            {skills.map(s => (
              <span key={s.id} className="text-[12px] text-slate-700">• {s.nom || s.competence}</span>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ClassicBlueTemplate;