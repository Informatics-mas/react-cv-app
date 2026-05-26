const MinimalistGreyTemplate = ({ data }) => {
  const { general, education, experience, skills, langue, hobbi } = data;

  return (
    <div className="w-full min-h-[297mm] bg-white p-12 text-slate-800" style={{ width: '210mm' }}>
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-100 pb-10 mb-10">
        <div className="w-48 h-48">
          <img src={general.img} className="w-full h-full rounded-full object-cover grayscale" alt="Profile" />
        </div>
        <div className="flex-1 pl-10">
          <h1 className="text-4xl font-light tracking-[8px] uppercase">{general.name} {general.lastName}</h1>
          <p className="text-slate-400 tracking-[4px] uppercase text-sm mt-3">{general.title}</p>
          <div className="mt-6 text-[11px] text-slate-500 space-y-1 font-bold uppercase">
            <p>📞 {general.phone} | ✉️ {general.email}</p>
            <p>📍 {general.address}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-12">
        <aside className="w-1/3 space-y-10">
          <section>
            <h3 className="text-xs font-black uppercase border-b border-slate-900 pb-1 mb-4">Langues</h3>
            {langue.map(l => (
              <p key={l.id} className="text-[11px] text-slate-600 uppercase flex justify-between">
                <span>{l.nom}</span> <span className="font-bold">{l.niveau}</span>
              </p>
            ))}
          </section>

          <section>
            <h3 className="text-xs font-black uppercase border-b border-slate-900 pb-1 mb-4">Compétences</h3>
            <div className="space-y-2">
              {skills.map(s => (
                <p key={s.id} className="text-[11px] text-slate-500 uppercase tracking-widest">• {s.nom || s.competence}</p>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-black uppercase border-b border-slate-900 pb-1 mb-4">Loisirs</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {hobbi.map(h => h.loisir).join(', ')}
            </p>
          </section>
        </aside>

        <main className="w-2/3 space-y-10">
          <section>
            <h3 className="text-xs font-black uppercase border-b border-slate-900 pb-1 mb-6">Expériences</h3>
            {experience.map(exp => (
              <div key={exp.id} className="mb-6">
                <div className="flex justify-between font-bold text-sm uppercase">
                  <span>{exp.position}</span>
                  <span className="text-slate-400 font-medium">{exp.start} - {exp.end}</span>
                </div>
                <p className="text-xs italic text-slate-700">{exp.company}</p>
                <p className="text-[11px] text-slate-500 mt-2">{exp.desc}</p>
              </div>
            ))}
          </section>

          <section>
            <h3 className="text-xs font-black uppercase border-b border-slate-900 pb-1 mb-6">Formation</h3>
            {education.map(edu => (
              <div key={edu.id} className="mb-6">
                <div className="flex justify-between font-bold text-sm uppercase">
                  <span>{edu.school}</span>
                  <span className="text-slate-400 font-medium">{edu.date}</span>
                </div>
                <p className="text-xs text-slate-700">{edu.title}</p>
              </div>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
};

export default MinimalistGreyTemplate;
