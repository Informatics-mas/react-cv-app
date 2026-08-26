import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  HelpCircle, 
  ChevronDown, 
  CreditCard, 
  FileText, 
  ShieldCheck,
  Mail,
  ArrowRight,
  MessageSquare
} from 'lucide-react';

function FAQ() {
  // Catégorie active pour le filtre
  const [activeCategory, setActiveCategory] = useState('Général');
  // Index de la question ouverte dans l'accordéon
  const [openIndex, setOpenIndex] = useState(null);

  // Données de la FAQ
  const faqData = [
    {
      category: 'Général',
      icon: <HelpCircle size={18} />,
      questions: [
        {
          q: "Qu'est-ce que CV.Craft ?",
          a: "CV.Craft est une plateforme intelligente qui vous permet de créer, structurer et exporter des CV professionnels de haute qualité, spécialement conçus pour passer les filtres ATS des recruteurs."
        },
        {
          q: "Mes données sont-elles en sécurité ?",
          a: "Absolument. Vos données sont chiffrées (SSL 256-bits) et stockées de manière sécurisée. Nous ne revendons jamais vos informations personnelles à des tiers."
        },
        {
          q: "Puis-je modifier mon CV après l'avoir téléchargé ?",
          a: "Oui, tant que vous avez un compte, vos CV sont sauvegardés dans votre espace membre. Vous pouvez revenir à tout moment pour les modifier et les exporter à nouveau."
        }
      ]
    },
    {
      category: 'Modèles & Édition',
      icon: <FileText size={18} />,
      questions: [
        {
          q: "Les modèles sont-ils compatibles ATS ?",
          a: "Oui, tous nos modèles (même les plus créatifs) sont codés de manière à ce que le texte puisse être lu et extrait correctement par les robots d'analyse de CV (ATS)."
        },
        {
          q: "Puis-je importer mon ancien CV ?",
          a: "Oui, avec nos plans Basic et Premium, vous pouvez utiliser notre outil d'analyse par IA pour injecter directement le contenu de votre ancien PDF dans notre éditeur."
        },
        {
          q: "Puis-je changer de modèle en cours de route ?",
          a: "Tout à fait ! Vous pouvez changer de modèle graphique à tout moment depuis l'éditeur. Vos données s'adapteront automatiquement au nouveau design."
        }
      ]
    },
    {
      category: 'Abonnements & Paiements',
      icon: <CreditCard size={18} />,
      questions: [
        {
          q: "Comment fonctionnent les limites de téléchargement ?",
          a: "Chaque plan inclut un nombre maximum de téléchargements PDF. Par exemple, le plan Gratuit permet 5 téléchargements. Une fois la limite atteinte, vous devrez passer à un plan supérieur."
        },
        {
          q: "Quels sont les moyens de paiement acceptés ?",
          a: "Nous acceptons les cartes bancaires (Visa, Mastercard) via notre processeur sécurisé, ainsi que les paiements par Mobile Money (Orange, MTN, Wave, Moov)."
        },
        {
          q: "Le paiement est-il récurrent (abonnement automatique) ?",
          a: "Non, vous payez pour une durée d'accès définie (par exemple 30 jours). Il n'y a aucun prélèvement automatique surprise à la fin de cette période."
        }
      ]
    }
  ];

  // Filtrer les questions selon la catégorie sélectionnée
  const currentQuestions = faqData.find(d => d.category === activeCategory)?.questions || [];

  const toggleQuestion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans flex flex-col antialiased">
      
      {/* --- HERO SECTION --- */}
      <div className="relative pt-20 pb-16 px-4 sm:px-6 text-center border-b border-slate-800/60 bg-gradient-to-b from-slate-900 to-[#0f172a]">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full mb-6 text-blue-400 text-xs font-bold uppercase tracking-widest">
          <MessageSquare size={14} /> Centre d'aide
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
          Comment pouvons-nous <span className="text-blue-500">vous aider ?</span>
        </h1>
        <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
          Trouvez des réponses rapides à vos questions sur l'utilisation de CV.Craft, nos abonnements et la sécurité de vos données.
        </p>
      </div>

      {/* --- CONTENU PRINCIPAL --- */}
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-12 flex flex-col md:flex-row gap-8 lg:gap-12 flex-grow">
        
        {/* Sidebar des catégories */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="sticky top-24 space-y-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 px-2">Catégories</h3>
            {faqData.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveCategory(cat.category);
                  setOpenIndex(null); // On ferme tout si on change de catégorie
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
                  activeCategory === cat.category 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className={`${activeCategory === cat.category ? 'text-white' : 'text-slate-500'}`}>
                  {cat.icon}
                </span>
                {cat.category}
              </button>
            ))}
          </div>
        </aside>

        {/* Zone des questions (Accordéon) */}
        <main className="flex-1 min-h-[400px]">
          <h2 className="text-2xl font-black mb-6 text-white flex items-center gap-2">
            {activeCategory}
          </h2>
          
          <div className="space-y-4">
            {currentQuestions.map((item, index) => {
              const isOpen = openIndex === index;
              return (
                <div 
                  key={index} 
                  className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
                    isOpen 
                    ? 'bg-slate-900/80 border-blue-500/50 shadow-lg shadow-blue-900/10' 
                    : 'bg-slate-900/30 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <button
                    onClick={() => toggleQuestion(index)}
                    className="w-full flex items-center justify-between p-5 sm:p-6 text-left focus:outline-none"
                  >
                    <span className={`font-bold text-base sm:text-lg pr-4 ${isOpen ? 'text-white' : 'text-slate-200'}`}>
                      {item.q}
                    </span>
                    <ChevronDown 
                      className={`shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180 text-blue-500' : 'text-slate-500'
                      }`} 
                      size={20} 
                    />
                  </button>
                  
                  {/* Le contenu de la réponse */}
                  <div 
                    className={`transition-all duration-300 ease-in-out ${
                      isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="p-5 sm:p-6 pt-0 text-slate-400 text-sm sm:text-base leading-relaxed border-t border-slate-800/50 mt-2">
                      {item.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Call to Action si la réponse n'y est pas */}
          <div className="mt-12 bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/50 rounded-3xl p-8 text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 border border-blue-500/20">
              <Mail className="text-blue-400" size={24} />
            </div>
            <h3 className="text-xl font-black mb-2">Vous n'avez pas trouvé votre réponse ?</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-md">
              Notre équipe de support est là pour vous accompagner dans la création de votre CV parfait.
            </p>
            <a 
              href="mailto:ogouogoudavid@gmail.com" 
              className="bg-white text-slate-900 hover:bg-slate-200 font-bold px-6 py-3 rounded-xl transition-colors flex items-center gap-2 text-sm"
            >
              Contacter le support <ArrowRight size={16} />
            </a>
          </div>
        </main>
      </div>

      {/* --- FOOTER SIMPLIFIÉ --- */}
      <footer className="border-t border-slate-900 bg-slate-950/20 py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <p className="text-slate-500 text-xs">© 2026 CV.Craft. Tous droits réservés.</p>
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
            <Link to="/models" className="text-slate-500 hover:text-white transition-colors">Modèles</Link>
            <Link to="/plans" className="text-slate-500 hover:text-white transition-colors">Tarifs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default FAQ;