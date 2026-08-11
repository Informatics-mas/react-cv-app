import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
// Ajout des icônes Eye et EyeOff
import { Lock, Mail, Loader2, FileText, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { FaGoogle, FaApple } from 'react-icons/fa';
import { BiError } from "react-icons/bi";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // État pour la visibilité
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedRole = localStorage.getItem("userRole"); 

    if (token && savedRole) {
      if (savedRole.toLowerCase() === "admin") {
        navigate("/Adminhome");
      } else {
        navigate("/Home");
      }
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        // 🔥 CHANGEMENT ICI : On utilise "token" pour tout le monde
        localStorage.setItem("token", data.token);
        localStorage.setItem("userRole", data.user.role); 

        const userRole = data.user?.role?.toLowerCase();
        
        if (userRole === "admin") {
          navigate("/Admin");
        } else {
          const origin = location.state?.from?.pathname || "/Home";
          navigate(origin);
        }
      } else {
        setError(data.message || "Email ou mot de passe incorrect.");
      }
    } catch (err) {
      setError("Le serveur est injoignable. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#131b2e] bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#1a2e5a] via-[#0B1A3B] to-black p-4">
      
      <nav className="w-full sticky top-0 z-50">
          <div className="flex justify-between items-center p-6 max-w-7xl mx-auto">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="bg-blue-600 p-2 rounded-lg">
                <FileText size={24} />
              </div>
              <span className="text-xl text-white font-bold tracking-tight">CV.Craft</span>
            </Link>
            
            <Link to="/" className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-medium">
              <ArrowLeft size={16} />
              Retour à l'accueil
            </Link>
          </div>
        </nav>

      <div className="w-full max-w-md animate-fadeIn">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-white tracking-tight">
              Connec<span className="text-blue-600">tez-vous</span>
            </h2>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold p-4 rounded-xl mb-8 flex items-center gap-3 text-center animate-shake">
              <span className="text-lg"><BiError /></span> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nom utilisateur ou Email</label>
              <div className="relative group">
                <input
                  type="email"
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-4 px-4 pl-12 text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all duration-300"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail className="absolute left-4 top-4.5 h-5 w-5 text-gray-500 group-focus-within:text-blue-600 transition-colors" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Mot de passe</label>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"} // Type dynamique[cite: 6]
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-4 px-4 pl-12 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all duration-300"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Lock className="absolute left-4 top-4.5 h-5 w-5 text-gray-500 group-focus-within:text-blue-600 transition-colors" />
                
                {/* Bouton pour basculer la visibilité */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4.5 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
               <p className="text-slate-500 text-center text-xs mt-6">
                  Mot de passe oublié ? <Link to="/sign-in" className="text-blue-500 hover:underline">reinitialisez-le</Link>
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-blue-600/10 active:scale-95 flex items-center justify-center disabled:opacity-50 mt-4"
            >
              {loading ? (
                <Loader2 className="animate-spin h-6 w-6" />
              ) : "Se Connecter"}
            </button>
          </form>

          {/* ... reste du composant (Google/Apple) ... */}
          <div className="text-center mt-8 space-y-4 max-w-sm mx-auto">
                
          {/*<div className="flex items-center justify-center bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                  <Link to="/login" className="flex-1 py-3.5 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95">
                    <FaGoogle className="h-5 w-5 text-blue-600" />
                    <span className="text-black font-bold text-sm">Google</span>
                  </Link>
                  <div className="w-[1px] h-6 bg-slate-300"></div>
                  <Link to="/login" className="flex-1 py-3.5 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95">
                    <FaApple className="h-5 w-5 text-black" />
                    <span className="text-black font-bold text-sm">Apple</span>
                  </Link>
                </div>*/}
                <p className="text-slate-500 text-xs mt-6">
                  Vous n'avez pas de compte ? <Link to="/sign-in" className="text-blue-500 hover:underline">Inscrivez-vous</Link>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}