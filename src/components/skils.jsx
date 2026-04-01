import '../styles/Experience.css';

function Skills({ data, onAdd, onUpdate, onRemove }) {
  return (
    <div className="section-container">
      <h3> Competences </h3>
      
      {data.map((skill) => (
        <div key={skill.id} className="form-item-group">
          <input
            placeholder="entrez une compétence"
            value={skill.competence}
            onChange={(e) => onUpdate(skill.id, { ...skill, competence: e.target.value })}
          />
          <button 
            type="button" 
            className="delete-btn" 
            onClick={() => onRemove(skill.id)}
          >
            Supprimer la compétence
          </button>
        </div>
      ))}

      <button type="button" className="add-btn" onClick={onAdd}>
        + Ajouter une compétence
      </button>
    </div>
  );
}

export default Skills;