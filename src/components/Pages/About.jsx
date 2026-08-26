import React from 'react';
import { Users, Target, Code, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

function About() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans antialiased py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft size={16} /> Retour à l'accueil
        </Link>
        
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
            La mission derrière <br/> CV.<span className="text-blue-500">Craft</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Nous croyons que la mise en page de votre CV ne devrait jamais être un frein à votre carrière. Votre talent mérite d'être mis en lumière, simplement et efficacement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800">
            <Target className="text-blue-500 w-10 h-10 mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">Notre Objectif</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Créer des CV qui plaisent aux humains, mais qui sont aussi parfaitement lisibles par les algorithmes de recrutement (ATS). Nous simplifions le processus technique pour que vous puissiez vous concentrer sur ce qui compte : votre parcours.
            </p>
          </div>

          <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800">
            <Code className="text-blue-500 w-10 h-10 mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">Conçu avec Passion</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Développé par <a href="https://real-portfolio-one-delta.vercel.app/" className="text-blue-400 hover:text-blue-500">Informatics</a>, CV.Craft est le fruit d'une expertise technique pointue (React, Node.js, IA) mise au service de l'expérience utilisateur. Chaque modèle est minutieusement codé pour un rendu PDF parfait.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700/50 rounded-3xl p-8 sm:p-12 text-center">
          <Users className="text-slate-300 w-12 h-12 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Une question ou une suggestion ?</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Nous sommes toujours à l'écoute de notre communauté pour améliorer la plateforme.
          </p>
          <a href="mailto:ogouogoudavid@gmail.com" className="inline-block bg-white text-slate-900 hover:bg-slate-200 font-bold px-8 py-3 rounded-xl transition-colors">
            Nous contacter
          </a>
        </div>
      </div>
    </div>
  );
}

export default About;