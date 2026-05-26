import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Sparkles, 
  LayoutTemplate, 
  Heart, 
  Mail,
  ArrowLeft
} from 'lucide-react';


function Models() {

  const getBackPath = () => {
    if (localStorage.getItem('adminToken')) return '/Home';
    if (localStorage.getItem('token')) return '/UserHome'; // ou la page de l'utilisateur
    return '/'; // Accueil par défaut
  };

  const CV_MODELS = [
    { id: 'modern', name: 'Moderne', desc: 'Design épuré avec sidebar colorée', color: 'bg-blue-500' },
    { id: 'classic', name: 'Classique', desc: 'Minimaliste et professionnel', color: 'bg-slate-500' },
    { id: 'tech', name: 'Tech', desc: 'Idéal pour les profils IT et créatifs', color: 'bg-emerald-500' },
    { id: 'benjamin', name: 'Benjamin', desc: 'Design moderne et épuré', color: 'bg-violet-500' },
    { id: 'designer', name: 'Designer', desc: 'Design artistique et créatif', color: 'bg-pink-500' },
    { id: 'futuristic', name: 'Futuriste', desc: 'Design innovant et moderne', color: 'bg-purple-500' },
    { id: 'Classic', name: 'Classic', desc: 'Design innovant et moderne', color: 'bg-red-500' },
    { id: 'Arch', name: 'Arch Design', desc: 'Design innovant et moderne', color: 'bg-cyan-500' },
    { id: 'Minimalist', name: 'Minimalist', desc: 'Design innovant et moderne', color: 'bg-gray-500' },
  ];

  return (
    <div className="min-h-screen bg-[#131b2e] text-white font-sans flex flex-col">
      {/* Navigation */}
      <nav className="w-full border-b border-slate-800/50 bg-[#131b2e]/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex justify-between items-center p-6 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight">CV.Craft</span>
          </Link>
          
          <Link to={getBackPath()} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-medium">
            <ArrowLeft size={16} />
            Retour à l'accueil
          </Link>
        </div>
      </nav>

      {/* Hero Models */}
      <header className="pt-16 pb-8 text-center px-6">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          Nos <span className="text-blue-500">Modèles</span>
        </h1>
        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
          Sélectionnez un design conçu pour passer les systèmes de filtrage (ATS) et capter l'attention des recruteurs.
        </p>
      </header>

      {/* Models Grid */}
      <section className="py-12 max-w-7xl mx-auto px-6 flex-1">
        <div className="grid md:grid-cols-5 gap-4">
          {CV_MODELS.map((model) => (
            <div key={model.id} className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden hover:border-blue-500 transition-all group flex flex-col h-full">
              {/* Simulation du visuel du CV */}
              <div className={`aspect-[3/4] ${model.color} opacity-20 group-hover:opacity-30 transition-opacity flex items-center justify-center relative`}>
                <LayoutTemplate size={60} className="text-white relative z-10" />
                {/* Petit badge "Populaire" sur le moderne par exemple */}
                {model.id === 'modern' && (
                  <span className="absolute top-4 right-4 bg-blue-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter opacity-100">
                    Populaire
                  </span>
                )}
              </div>

              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-bold mb-2">{model.name}</h3>
                <p className="text-slate-400 text-sm mb-8 flex-1">{model.desc}</p>

                <Link 
                  to={`/Create?template=${model.id}`}
                  className="block w-full text-center bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"
                >
                  Choisir ce modèle
                </Link>
              </div>
            </div>
          ))}
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

export default Models;