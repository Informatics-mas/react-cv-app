import '../styles/Experience.css';

function Hobbi({ data, onAdd, onUpdate, onRemove }) {
  return (
    <div className="section-container">
      <h3> hobbi </h3>
      
      {data.map((hobbi) => (
        <div key={hobbi.id} className="form-item-group">
          <input
            placeholder="entrez un loisir"
            value={hobbi.loisir}
            onChange={(e) => onUpdate(hobbi.id, { ...hobbi, loisir: e.target.value })}
          />
          <button 
            type="button" 
            className="delete-btn" 
            onClick={() => onRemove(hobbi.id)}
          >
            Supprimer le loisir
          </button>
        </div>
      ))}

      <button type="button" className="add-btn" onClick={onAdd}>
        + Ajouter un loisir
      </button>
    </div>
  );
}

export default Hobbi;