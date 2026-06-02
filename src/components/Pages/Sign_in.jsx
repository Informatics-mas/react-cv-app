import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Lock, Mail, User, Loader2, FileText, ArrowLeft } from "lucide-react";
import { FaGoogle, FaApple } from 'react-icons/fa';

export default function Signin() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Rediriger si déjà connecté pour éviter les doubles inscriptions
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Optionnel : tu pourrais ici aussi vérifier le rôle stocké pour rediriger vers /Adminhome ou /Home
      navigate("/Home");
    }
  }, [navigate]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // 2. Si le backend connecte l'utilisateur immédiatement après l'inscription
        if (data.token) {
          // On stocke TOUTES les informations nécessaires pour le fonctionnement global[cite: 21]
          localStorage.setItem("token", data.token);
          localStorage.setItem("userRole", data.user.role); // 💡 TRÈS IMPORTANT : Ajoute cette ligne !
        
          const userRole = data.user?.role?.toLowerCase();
        
          if (userRole === "admin") {
            navigate("/Adminhome"); // Redirection Admin
          } else {
            // Redirige vers Home ou vers la page où il était avant[cite: 20]
            const origin = location.state?.from?.pathname || "/Home";
            navigate(origin);
          }
        } else {
          // Si jamais le backend change et ne renvoie plus de token[cite: 20]
          navigate("/login", { state: { message: "Compte créé ! Veuillez vous connecter." } });
        }
      } else {
        setError(data.message || "Erreur lors de l'inscription.");
      }
    } catch (err) {
      console.error("Erreur Inscription:", err);
      setError("Le serveur est injoignable. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#131b2e] bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#1a2e5a] via-[#0B1A3B] to-black p-4">
      
      <nav className="w-full absolute top-0 z-50">
        <div className="flex justify-between items-center p-6 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText size={24} className="text-white" />
            </div>
            <span className="text-xl text-white font-bold tracking-tight">CV.Craft</span>
          </Link>

          <Link to="/" className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-medium">
            <ArrowLeft size={16} />
            Retour à l'accueil
          </Link>
        </div>
      </nav>
      
      <div className="w-full max-w-md mt-16 animate-fadeIn">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-white tracking-tight">
              Inscri<span className="text-blue-600">vez-vous</span>
            </h2>
            <p className="text-slate-400 text-sm mt-2">Rejoignez Informatics pour créer votre CV.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold p-4 rounded-xl mb-6 flex items-center gap-3">
              <span className="text-lg">⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Nom complet</label>
              <div className="relative group">
                <input
                  type="text"
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-4 px-4 pl-12 text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all duration-300"
                  placeholder="Ogou David..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <User className="absolute left-4 top-4 h-5 w-5 text-gray-500 group-focus-within:text-blue-600 transition-colors" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Votre Email</label>
              <div className="relative group">
                <input
                  type="email"
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-4 px-4 pl-12 text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all duration-300"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Mail className="absolute left-4 top-4 h-5 w-5 text-gray-500 group-focus-within:text-blue-600 transition-colors" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Mot de passe</label>
              <div className="relative group">
                <input
                  type="password"
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-4 px-4 pl-12 text-white placeholder-gray-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all duration-300"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Lock className="absolute left-4 top-4 h-5 w-5 text-gray-500 group-focus-within:text-blue-600 transition-colors" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98] flex items-center justify-center disabled:opacity-50 mt-4"
            >
              {loading ? (
                <Loader2 className="animate-spin h-6 w-6" />
              ) : "Créer mon compte"}
            </button>
          </form>

          <div className="text-center mt-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-[1px] bg-white/10 flex-1"></div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ou continuer avec</span>
              <div className="h-[1px] bg-white/10 flex-1"></div>
            </div>

            <div className="flex items-center justify-center bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
              <button className="flex-1 py-3.5 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95">
                <FaGoogle className="h-4 w-4 text-blue-600" />
                <span className="text-black font-bold text-xs">Google</span>
              </button>
              <div className="w-[1px] h-6 bg-slate-300"></div>
              <button className="flex-1 py-3.5 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95">
                <FaApple className="h-5 w-5 text-black" />
                <span className="text-black font-bold text-xs">Apple</span>
              </button>
            </div>

            <p className="text-slate-500 text-xs mt-6">
              Déjà un compte ? <Link to="/login" className="text-blue-500 font-bold hover:underline">Se connecter</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}