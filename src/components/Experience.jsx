import '../styles/Experience.css';

function Experience({ data, onAdd, onUpdate, onRemove }) {
  return (
    <div className="section-container">
      <h3>💼 Expérience Professionnelle</h3>
      
      {data.map((exp) => (
        <div key={exp.id} className="form-item-group">
          <input
            placeholder="Nom de l'entreprise"
            value={exp.company}
            onChange={(e) => onUpdate(exp.id, { ...exp, company: e.target.value })}
          />
          <input
            placeholder="Intitulé du poste"
            value={exp.position}
            onChange={(e) => onUpdate(exp.id, { ...exp, position: e.target.value })}
          />
          <div className="date-group">
            <input
              placeholder="Date de début"
              value={exp.start}
              onChange={(e) => onUpdate(exp.id, { ...exp, start: e.target.value })}
            />
            <input
              placeholder="Date de fin"
              value={exp.end}
              onChange={(e) => onUpdate(exp.id, { ...exp, end: e.target.value })}
            />
          </div>
          <textarea
            placeholder="Missions et responsabilités..."
            value={exp.desc}
            onChange={(e) => onUpdate(exp.id, { ...exp, desc: e.target.value })}
            rows="4"
          />
          <button 
            type="button" 
            className="delete-btn" 
            onClick={() => onRemove(exp.id)}
          >
            Supprimer l'expérience
          </button>
        </div>
      ))}

      <button type="button" className="add-btn" onClick={onAdd}>
        + Ajouter une expérience
      </button>
    </div>
  );
}

export default Experience;