import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/Home";
import Create from "./components/Create";
import Models from "./components/Models";
import './styles/App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- ROUTES PUBLIQUES --- */}
        <Route path="/" element={<Home />} />
        <Route path="/Create" element={<Create />} />
        <Route path="/Models" element={<Models />} />

        {/* --- SÉCURITÉ : REDIRECTION 404 --- */}
        {/* Si l'utilisateur tape une adresse inconnue, on le ramène à l'accueil */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;