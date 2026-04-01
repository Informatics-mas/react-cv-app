import React from 'react';
import { FileText, Sparkles, LayoutTemplate } from 'lucide-react';
import { Link} from 'react-router-dom';

function Home() {
  return (
    <div className="min-h-screen bg-[#131b2e] text-white font-sans">
      {/* Navigation Simple */}
      <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <FileText size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">CV.Craft</span>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-2 gap-12 items-center">
        
        {/* Texte et Appel à l'action */}
        <div className="space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full">
            <Sparkles size={16} className="text-blue-400" />
            <span className="text-sm font-medium text-blue-400">Le créateur de CV pour tous</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold leading-tight">
            Décrochez votre <br />
            <span className="text-blue-500">Job de Rêve</span> en 5 minutes.
          </h1>
          
          <p className="text-slate-400 text-lg max-w-xl mx-auto lg:mx-0">
            Créez un CV professionnel, moderne et optimisé pour les recruteurs. 
            Pas de design à gérer, on s'occupe de tout pour vous.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
            <Link to="/Create"
           className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 transition-all transform hover:-translate-y-1">
          Créer mon CV maintenant
        </Link>
             {/* <button className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 px-8 py-4 rounded-xl font-bold text-lg transition-all">
              Voir les modèles
            </button>*/}
          </div>
        </div>

        {/* Visuel d'aperçu (Mockup) */}
       
      </main>

      {/* Features rapides */}
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
    </div>
  );
};

// Petit sous-composant pour les cartes de features
const FeatureCard = ({ icon, title, desc }) => (
  <div className="space-y-4">
    <div className="bg-slate-800 w-12 h-12 rounded-lg flex items-center justify-center">
      {icon}
    </div>
    <h3 className="text-xl font-bold">{title}</h3>
    <p className="text-slate-400 leading-relaxed">{desc}</p>
  </div>
);

export default Home;