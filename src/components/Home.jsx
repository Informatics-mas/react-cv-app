import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Sparkles, 
  LayoutTemplate, 
  Heart, 
  Mail,
  ArrowRight,
  Upload
} from 'lucide-react';

function Home() {
  const [activeIndex, setActiveIndex] = useState(0);

  const carouselItems = [
    {
      to: "/Create",
      text: "Créer mon CV maintenant",
      icon: <ArrowRight size={20} className="shrink-0" />,
      className: "bg-blue-600 hover:bg-blue-500 shadow-blue-600/20 border border-transparent"
    },
    {
      to: "/Create",
      text: "Importer mon CV et changer de modèle",
      icon: <Upload size={20} className="shrink-0" />,
      className: "bg-blue-600 hover:bg-blue-500 shadow-slate-800/20 border border-transparent"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % carouselItems.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [carouselItems.length]);

  return (
    <div className="min-h-screen bg-[#131b2e] text-white font-sans flex flex-col overflow-x-hidden">
      {/* Navigation Responsive */}
      <nav className="w-full border-b border-slate-800/50 bg-[#131b2e]/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex justify-between items-center p-4 sm:p-6 max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="bg-blue-600 p-2 rounded-lg shrink-0">
              <FileText size={22} />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight">CV.Craft</span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            <Link 
              to="/Models" 
              className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-full font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 build"
            >
              Modèles <ArrowRight size={14} />
            </Link>

            <Link 
              to="/login" 
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-full font-bold text-xs sm:text-sm transition-all shadow-lg shadow-blue-600/20"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Flex-col sur mobile, Flex-row sur Desktop */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-12 lg:py-24 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-8 flex-1">
        
        {/* Texte à gauche */}
        <div className="space-y-6 text-center lg:text-left w-full lg:w-1/2">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full">
            <Sparkles size={14} className="text-blue-400 shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-blue-400">Le créateur de CV pour tous</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-tight tracking-tight">
            Décrochez votre <br className="hidden sm:inline" />
            <span className="text-blue-500">Job de Rêve</span> en 5 minutes.
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">
            Créez un CV professionnel, moderne et optimisé pour les recruteurs. 
            Pas de design à gérer, on s'occupe de tout pour vous.
          </p>
        </div>

        {/* Zone Carrousel à droite */}
        <div className="w-full lg:w-1/2 max-w-md lg:max-w-xl flex flex-col items-center lg:items-end justify-center min-h-[140px] px-2">
          <div className="relative w-full h-24 flex items-center justify-center">
            {carouselItems.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <div
                  key={index}
                  className={`absolute w-full transition-all duration-700 ease-in-out transform flex justify-center lg:justify-end
                    ${isActive 
                      ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto z-10' 
                      : 'opacity-0 -translate-y-4 scale-95 pointer-events-none z-0'
                    }`}
                >
                  <Link
                    to={item.to}
                    className={`${item.className} text-white w-full sm:w-auto min-w-[280px] sm:min-w-[380px] flex items-center justify-center gap-3 px-6 sm:px-8 py-4 rounded-xl font-bold text-sm sm:text-base lg:text-lg shadow-lg transition-all transform hover:-translate-y-0.5 text-center`}
                  >
                    <span className="truncate">{item.text}</span>
                    {item.icon}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Indicateurs de progression */}
          <div className="flex gap-2 mt-2 lg:mr-2">
            {carouselItems.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === activeIndex ? 'w-8 bg-blue-500' : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
                aria-label={`Bouton ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Features Grid Responsive */}
      <section className="bg-slate-900/50 py-16 sm:py-20 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
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

      {/* Footer Responsive */}
      <footer className="bg-[#0f172a] border-t border-slate-800 pt-12 sm:pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12 sm:mb-16">
            <div className="space-y-4">
              <div className="flex items-center gap-2 justify-start">
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
              <h4 className="font-bold mb-4 sm:mb-6 text-sm uppercase text-slate-300">Produit</h4>
              <ul className="space-y-3 sm:space-y-4 text-slate-400 text-sm">
                <li><Link to="/Create" className="hover:text-white">Créateur de CV</Link></li>
                <li><Link to="/Models" className="hover:text-white">Modèles</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 sm:mb-6 text-sm uppercase text-slate-300">Aide</h4>
              <ul className="space-y-3 sm:space-y-4 text-slate-400 text-sm">
                <li><a href="#" className="hover:text-white">FAQ</a></li>
                <li><a href="mailto:ogouogoudavid@gmail.com" className="hover:text-white">Contact</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4 sm:mb-6 text-sm uppercase text-slate-300">Contact</h4>
              <div className="flex items-center gap-2 text-slate-400 text-sm break-all">
                <Mail size={16} className="shrink-0" />
                <span>ogouogoudavid@gmail.com</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/50 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
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
  <div className="space-y-3 bg-slate-800/20 md:bg-transparent p-6 md:p-0 rounded-2xl border border-slate-800/30 md:border-transparent">
    <div className="bg-slate-800 w-12 h-12 rounded-lg flex items-center justify-center shrink-0">
      {icon}
    </div>
    <h3 className="text-xl font-bold">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
  </div>
);

export default Home;