import React from 'react';
import { FileText, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

function Terms() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans antialiased py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft size={16} /> Retour à l'accueil
        </Link>
        
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full mb-4 text-blue-400 text-xs font-bold uppercase tracking-widest">
            <FileText size={14} /> Mentions Légales
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">Conditions <span className="text-blue-500">d'Utilisation</span></h1>
          <p className="text-slate-400">Dernière mise à jour : Août 2026</p>
        </div>

        <div className="space-y-8 text-slate-300 leading-relaxed text-sm md:text-base">
          <section className="bg-slate-900/50 p-6 sm:p-8 rounded-3xl border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><CheckCircle2 className="text-blue-500" /> 1. Description du service</h2>
            <p>CV.Craft est un outil en ligne permettant la création, l'édition et l'exportation de Curriculum Vitae au format PDF. L'utilisation de notre éditeur implique l'acceptation pleine et entière des présentes conditions générales.</p>
          </section>

          <section className="bg-slate-900/50 p-6 sm:p-8 rounded-3xl border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><CheckCircle2 className="text-blue-500" /> 2. Abonnements et Quotas</h2>
            <p className="mb-4">Le service est proposé selon différents plans (Gratuit, Basic, Premium) :</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-4">
              <li>Chaque plan donne droit à un nombre défini de téléchargements PDF.</li>
              <li>Les paiements sont uniques pour une période donnée (sans renouvellement automatique abusif).</li>
              <li>En cas d'atteinte de la limite de téléchargement, l'utilisateur devra souscrire à une offre supérieure.</li>
            </ul>
          </section>

          <section className="bg-slate-900/50 p-6 sm:p-8 rounded-3xl border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><AlertCircle className="text-blue-500" /> 3. Responsabilités</h2>
            <p>L'utilisateur est seul responsable du contenu qu'il intègre dans son CV. CV.Craft ne saurait être tenu responsable des fausses déclarations faites par les utilisateurs envers des recruteurs, ni garantir l'obtention systématique d'un emploi suite à l'utilisation de nos modèles.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Terms;