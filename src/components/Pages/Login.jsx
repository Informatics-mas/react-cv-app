"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
// Ajout des icônes Eye et EyeOff
import { Lock, Mail, Loader2, FileText, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { FaGoogle, FaApple } from 'react-icons/fa';
import { BiError } from "react-icons/bi";
import { api } from "../../api/client";
import { USER_ROLES } from "../../constants";
import { useAuth } from "../../context/useAuth";

/**
 * Destination interne sûre après connexion (?from= transmis par les layouts).
 * - absente ou invalide (URL externe, //, protocole…) → "/Home" (repli d'origine) ;
 * - jamais de redirection vers une URL fournie par l'utilisateur ;
 * - pas de boucle : /login et /sign-in sont écartés.
 */
function safeInternalFrom() {
  if (typeof window === "undefined") return "/home";
  const raw = new URLSearchParams(window.location.search).get("from");
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return "/home";
  }
  const path = raw.split("?")[0].split("#")[0];
  if (path === "/login" || path === "/sign-in") return "/home";
  return raw;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // État pour la visibilité
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const router = useRouter();
  const { refresh, user: authUser, loading: authLoading } = useAuth(); // recharge le profil via AuthProvider

  // Redirection si une session est DÉJÀ active (cookie httpOnly validé par
  // /auth/me) — jamais basée sur un ancien token localStorage.
  useEffect(() => {
    if (authLoading || !authUser) return;
    router.push(String(authUser.role).toLowerCase() === "admin" ? "/admin" : "/home");
  }, [authLoading, authUser, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await api.post("/auth/login", { email, password });

      if (data.user) {
       const storage = window.localStorage;
        // JWT = cookie httpOnly (contrat backend Phase 3b) — jamais stocké côté client.
        storage.setItem("userRole", data.user.role);
        refresh(); //(AuthProvider) : le profil est rechargé pour tout l'app

       const isAdmin = String(data.user?.role) === USER_ROLES.ADMIN;
        if (isAdmin) {
          router.push("/admin");
        } else {
          const origin = safeInternalFrom();
          router.push(origin);
        }
      } else {
        setError("Email ou mot de passe incorrect.");
      }
    } catch (err) {
      // ApiError : message serveur traduit, jamais de texte technique
      setError(err.message || "Le serveur est injoignable. Vérifiez votre connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-[#131b2e] bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#1a2e5a] via-[#0B1A3B] to-black p-4">
      
      <Link href="/" className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-medium mb-6">
                  <ArrowLeft size={16} />
                  Retour à l'accueil
                </Link>

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
                  Mot de passe oublié ? <Link href="/sign-in" className="text-blue-500 hover:underline">reinitialisez-le</Link>
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
                  <Link href="/login" className="flex-1 py-3.5 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95">
                    <FaGoogle className="h-5 w-5 text-blue-600" />
                    <span className="text-black font-bold text-sm">Google</span>
                  </Link>
                  <div className="w-[1px] h-6 bg-slate-300"></div>
                  <Link href="/login" className="flex-1 py-3.5 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95">
                    <FaApple className="h-5 w-5 text-black" />
                    <span className="text-black font-bold text-sm">Apple</span>
                  </Link>
                </div>*/}
                <p className="text-slate-500 text-xs mt-6">
                  Vous n'avez pas de compte ? <Link href="/sign-in" className="text-blue-500 hover:underline">Inscrivez-vous</Link>
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}