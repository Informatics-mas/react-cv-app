import '../styles/Education.css';

//function Education({ data, onChange }) {
//  const handleChange = (e) => {
//    const { name, value } = e.target;
//    onChange({ ...data, [name]: value });
//  };
//
//  return (
//    <div className="form-section">
//      <h3>🎓 Formation</h3>
//      <input
//        name="school"
//        placeholder="Nom de l'établissement"
//        value={data.school}
//        onChange={handleChange}
//      />
//      <input
//        name="title"
//        placeholder="Intitulé du diplôme"
//        value={data.title}
//        onChange={handleChange}
//      />
//      <input
//        name="date"
//        placeholder="Dates (ex: 2020 - 2023)"
//        value={data.date}
//        onChange={handleChange}
//      />
//    </div>
//  );
//}

import '../styles/Education.css';

function Education({ data, onAdd, onUpdate, onRemove }) {
  return (
    <div className="section-container">
      <h3>🎓 Formation</h3>
      
      {data.map((edu) => (
        <div key={edu.id} className="form-item-group">
          <input
            placeholder="Nom de l'établissement"
            value={edu.school}
            onChange={(e) => onUpdate(edu.id, { ...edu, school: e.target.value })}
          />
          <input
            placeholder="Intitulé du diplôme"
            value={edu.title}
            onChange={(e) => onUpdate(edu.id, { ...edu, title: e.target.value })}
          />
          <input
            placeholder="Dates (ex: 2020 - 2023)"
            value={edu.date}
            onChange={(e) => onUpdate(edu.id, { ...edu, date: e.target.value })}
          />
          <button 
            type="button" 
            className="delete-btn" 
            onClick={() => onRemove(edu.id)}
          >
            Supprimer
          </button>
        </div>
      ))}

      <button type="button" className="add-btn" onClick={onAdd}>
        + Ajouter une formation
      </button>
    </div>
  );
}

export default Education;

//export default Education;