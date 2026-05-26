import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from './utils/ProtectedRoute';
import Home from "./components/Home";
import Home2 from "./components/Home2";
import Create from "./components/Create";
import Models from "./components/Models";
import PlanCards from "./components/Plans";
import Login from "./components/Pages/Login";
import Signin from "./components/Pages/Sign_in";
import Adminhome from "./components/Admin/Adminhome"
import AdminPlans from './components/Admin/AdminPlans';
import './styles/App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ROUTES PUBLIQUES */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/sign-in" element={<Signin />} />
        <Route path="/Create" element={<Create />} />
        <Route path="/Models" element={<Models />} />
        <Route path="/Plan" element={<PlanCards />} />

        {/* ROUTES UTILISATEURS CONNECTÉS */}
        <Route element={<ProtectedRoute allowedRoles={['user', 'admin']} />}>
          <Route path="/Home" element={<Home2 />} />
          <Route path="/Plans" element={<PlanCards />} />
        </Route>
        
        {/* ROUTES ADMIN UNIQUEMENT */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/Admin/*" element={<Adminhome />} />
          <Route path="/AdminPlans" element={<AdminPlans />} />
        </Route>

        {/* --- SÉCURITÉ : REDIRECTION 404 --- */}
        {/* Si l'utilisateur tape une adresse inconnue, on le ramène à l'accueil */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;