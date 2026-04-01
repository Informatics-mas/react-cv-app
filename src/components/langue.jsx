import '../styles/Experience.css';

function Langue({ data, onAdd, onUpdate, onRemove }) {
  return (
    <div className="section-container">
      <h3> Langue </h3>
      
      {data.map((langue) => (
        <div key={langue.id} className="form-item-group">
          <input
            placeholder="entrez une langue"
            value={langue.langue}
            onChange={(e) => onUpdate(langue.id, { ...langue, langue: e.target.value })}
          />
          <button 
            type="button" 
            className="delete-btn" 
            onClick={() => onRemove(langue.id)}
          >
            Supprimer la langue
          </button>
        </div>
      ))}

      <button type="button" className="add-btn" onClick={onAdd}>
        + Ajouter une langue
      </button>
    </div>
  );
}

export default Langue;