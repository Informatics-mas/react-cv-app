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