import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from './utils/ProtectedRoute';
import Home from "./components/Home";
import Home2 from "./components/Home2";
import Create from "./components/Create";
import Payment from "./components/Payment";
import Models from "./components/Models";
import PlanCards from "./components/Plans";
import Login from "./components/Pages/Login";
import Signin from "./components/Pages/Sign_in";
import Navbar from "./components/Pages/Navbar";
import Privacy from './components/Pages/Privacy';
import Terms from './components/Pages/Terms';
import About from './components/Pages/About';
import FAQ from './components/Pages/FAQ';
import Footer from "./components/Pages/Footer";
import Adminhome from "./components/Admin/Adminhome"
import AdminPlans from './components/Admin/AdminPlans';
import './styles/App.css';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* ROUTES PUBLIQUES */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/sign-in" element={<Signin />} />
        <Route path="/Create" element={<Create />} />
        <Route path="/Models" element={<Models />} />
        <Route path="/Plan" element={<PlanCards />} />
        <Route path="/FAQ" element={<FAQ />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/Terms" element={<Terms />} />
        <Route path="/about" element={<About />} />

        {/* ROUTES UTILISATEURS CONNECTÉS */}
        <Route element={<ProtectedRoute allowedRoles={['user', 'admin']} />}>
          <Route path="/Home" element={<Home2 />} />
          <Route path="/Plans" element={<PlanCards />} />
          <Route path="/payment" element={<Payment />} />
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
      <Footer />
    </BrowserRouter>
  );
}

export default App;