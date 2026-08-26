const ArchTemplate = ({ data }) => {
  const { general, education, experience, skills, langue, hobbi } = data;

  return (
    <div className="w-full flex flex-row min-h-[297mm] bg-white font-sans" style={{ width: '210mm' }}>
      {/* Sidebar */}
      <aside className="w-[38%] bg-slate-50 relative flex flex-col">
        <div className="p-8 text-center relative z-10">
          <h1 className="text-2xl font-black text-slate-900 uppercase leading-none">{general.name} {general.lastName}</h1>
          <p className="text-[10px] tracking-[3px] text-slate-500 uppercase font-bold mt-2">{general.title}</p>
        </div>

        <div className="px-8 mb-6">
          <div className="relative">
             <img src={general.img} className="w-40 h-40 rounded-full mx-auto object-cover border-8 border-white relative z-10" alt="Profile" />
             <div className="absolute top-1/2 left-0 w-full h-48 bg-slate-900 rounded-t-full -translate-y-4"></div>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-8 flex-1 rounded-tr-[100px] space-y-8">
          {/* Langues */}
          <section>
            <h3 className="font-bold uppercase text-[13px] border-b border-white/20 pb-2 mb-4">Langues</h3>
            {langue.map(l => (
              <p key={l.id} className="text-[11px] mb-1">{l.nom} - <span className="text-slate-400 italic">{l.niveau}</span></p>
            ))}
          </section>

          {/* Loisirs */}
          <section>
            <h3 className="font-bold uppercase text-[13px] border-b border-white/20 pb-2 mb-4">Loisirs</h3>
            <div className="flex flex-wrap gap-2">
              {hobbi.map(h => (
                <span key={h.id} className="text-[10px] bg-white/10 px-2 py-1 rounded">{h.loisir}</span>
              ))}
            </div>
          </section>
        </div>
      </aside>

      {/* Main Content */}
      <main className="w-[62%] p-10">
        <section className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white text-xs font-bold">1</div>
            <h3 className="font-black uppercase text-lg tracking-tighter">About Me</h3>
          </div>
          <p className="text-[12px] text-slate-600 leading-relaxed">{general.summary}</p>
        </section>

        <section className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white text-xs font-bold">2</div>
            <h3 className="font-black uppercase text-lg tracking-tighter">Expériences</h3>
          </div>
          {experience.map(exp => (
            <div key={exp.id} className="mb-4 pl-4 border-l-2 border-slate-100">
              <h4 className="font-bold text-[13px]">{exp.position}</h4>
              <p className="text-[11px] text-slate-500">{exp.company} | {exp.start} - {exp.end}</p>
            </div>
          ))}
        </section>

        <section className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white text-xs font-bold">3</div>
            <h3 className="font-black uppercase text-lg tracking-tighter">Formation</h3>
          </div>
          {education.map(edu => (
            <div key={edu.id} className="mb-4 pl-4 border-l-2 border-slate-100">
              <h4 className="font-bold text-[13px]">{edu.school}</h4>
              <p className="text-[11px] text-slate-500">{edu.title} | {edu.date}</p>
            </div>
          ))}
        </section>

        <section>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center text-white text-xs font-bold">4</div>
            <h3 className="font-black uppercase text-lg tracking-tighter">Compétences</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 pl-4">
            {skills.map(s => (
              <p key={s.id} className="text-[11px] text-slate-600">• {s.nom || s.competence}</p>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ArchTemplate;