import React from 'react';
import { Link } from 'react-router-dom';
import { FaUser } from 'react-icons/fa';
import { 
  FileText, 
  Sparkles, 
  LayoutTemplate, 
  Heart,
  User, 
  LogOut,
  Mail,
  ArrowRight
} from 'lucide-react';

// Si tu veux vraiment GitHub, essaie "Github" ou "GitHub". 
// Si ça plante encore, on utilisera du texte simple pour l'instant.

function Home2() {
  const handleLogout = () => {
  // Supprime le token et les données sensibles
  localStorage.removeItem("adminToken");
  localStorage.removeItem("cv_data_pro"); // Optionnel : si tu veux vider le CV en cours
  
  // Redirige vers l'accueil ou le login
  window.location.href = "/"; 
 };

  return (
    <div className="min-h-screen bg-[#131b2e] text-white font-sans flex flex-col">
      {/* Navigation Simple */}
      <nav className="w-full border-b border-slate-800/50 bg-[#131b2e]/50 backdrop-blur-md sticky top-0 z-50">
              <div className="flex justify-between items-center p-6 max-w-7xl mx-auto">
                <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <FileText size={24} />
                  </div>
                  <span className="text-xl font-bold tracking-tight">CV.Craft</span>
                </Link>

                <div className="flex justify-between items-center gap-4">
                  {/* Bouton Modèles existant */}
                  <Link 
                    to="/Models" 
                    className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-full font-bold text-sm shadow-lg shadow-blue-600/20 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2 text-white"
                  >
                    Modèles <ArrowRight size={16} /> 
                  </Link>

                  {/* Nouveau bouton de Déconnexion */}
                  <button 
                    onClick={handleLogout}
                    className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-full font-bold text-sm border border-red-500/20 transition-all flex items-center gap-2"
                  >
                    <LogOut size={16} /> 
                    Déconnexion
                  </button>
                </div>
              </div>
            </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-24 items-center flex-1">
        
        <div className="space-y-8 text-center lg:text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full">
            <Sparkles size={16} className="text-blue-400" />
            <span className="text-sm font-medium text-blue-400">Le créateur de CV pour tous</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold leading-tight">
            Décrochez votre <br />
            <span className="text-blue-500">Job de Rêve </span> en 5 minutes.
          </h1>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">

          <p className="text-slate-400 text-lg max-w-xl mx-auto lg:mx-0">
            Créez un CV professionnel, moderne et optimisé pour les recruteurs. 
            Pas de design à gérer, on s'occupe de tout pour vous.
          </p>
            <Link to="/Create"
              className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 transition-all transform hover:-translate-y-1 text-center">
              Créer mon CV maintenant
            </Link>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="bg-slate-900/50 py-20 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12">
          <FeatureCard 
            icon={<LayoutTemplate className="text-blue-500" />}
            title="Design Pro"
            desc="Des templates testés par des recruteurs pour maximiser vos chances."
          />
          <FeatureCard 
            icon={<Sparkles className="text-purple-500" />}
            title="Export Rapide"
            desc="Téléchargez votre CV en PDF haute qualité en un clic."
          />
          <FeatureCard 
            icon={<FileText className="text-emerald-500" />}
            title="Responsive"
            desc="Modifiez votre CV sur mobile, tablette ou ordinateur."
          />
        </div>
      </section>

      {/* Footer sans les icônes qui buggent */}
      <footer className="bg-[#0f172a] border-t border-slate-800 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="bg-blue-600 p-1.5 rounded-md">
                  <FileText size={18} />
                </div>
                <span className="text-lg font-bold tracking-tight">CV.Craft</span>
              </div>
              <p className="text-slate-400 text-sm">
                La plateforme ultime pour créer des CV professionnels.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-sm uppercase text-slate-300">Produit</h4>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li><Link to="/Create" className="hover:text-white">Créateur de CV</Link></li>
                <li><Link to="/Models" className="hover:text-white">Modèles</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-sm uppercase text-slate-300">Aide</h4>
              <ul className="space-y-4 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white">FAQ</a></li>
                <li><a href="mailto:ogouogoudavid@gmail.com" className="hover:text-white">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-sm uppercase text-slate-300">Contact</h4>
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Mail size={16} />
                <span>ogouogoudavid@gmail.com</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/50 pt-8 flex justify-between items-center">
            <p className="text-slate-500 text-xs">© 2026 CV.Craft. Tous droits réservés.</p>
            <p className="text-slate-500 text-xs flex items-center gap-1">
              Fait avec <Heart size={12} className="text-red-500 fill-red-500" /> par Informatics
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const FeatureCard = ({ icon, title, desc }) => (
  <div className="space-y-4">
    <div className="bg-slate-800 w-12 h-12 rounded-lg flex items-center justify-center">
      {icon}
    </div>
    <h3 className="text-xl font-bold">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
  </div>
);

export default Home2;