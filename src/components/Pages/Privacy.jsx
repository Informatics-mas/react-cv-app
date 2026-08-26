import React from 'react';
import { Shield, Lock, Eye, Database, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

function Privacy() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans antialiased py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft size={16} /> Retour à l'accueil
        </Link>
        
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full mb-4 text-blue-400 text-xs font-bold uppercase tracking-widest">
            <Shield size={14} /> Sécurité des données
          </div>
          <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">Politique de <span className="text-blue-500">Confidentialité</span></h1>
          <p className="text-slate-400">Dernière mise à jour : Août 2026</p>
        </div>

        <div className="space-y-8 text-slate-300 leading-relaxed text-sm md:text-base">
          <section className="bg-slate-900/50 p-6 sm:p-8 rounded-3xl border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Database className="text-blue-500" /> 1. Données collectées</h2>
            <p className="mb-4">Chez CV.Craft, nous ne collectons que les données strictement nécessaires pour vous fournir notre service de création de CV :</p>
            <ul className="list-disc list-inside space-y-2 text-slate-400 ml-4">
              <li><strong>Informations de compte :</strong> Nom, adresse e-mail et mot de passe (chiffré).</li>
              <li><strong>Données du CV :</strong> Les informations que vous saisissez dans l'éditeur (expériences, formations, compétences) sont sauvegardées pour vous permettre de les modifier ultérieurement.</li>
              <li><strong>Données de paiement :</strong> Gérées de manière sécurisée par nos prestataires (nous ne stockons pas vos numéros de carte bancaire).</li>
            </ul>
          </section>

          <section className="bg-slate-900/50 p-6 sm:p-8 rounded-3xl border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Lock className="text-blue-500" /> 2. Protection et Stockage</h2>
            <p>Vos données personnelles sont stockées sur des serveurs sécurisés. Nous utilisons le chiffrement SSL 256-bits pour toutes les communications entre votre navigateur et nos serveurs. L'accès à vos données est strictement restreint à votre propre compte.</p>
          </section>

          <section className="bg-slate-900/50 p-6 sm:p-8 rounded-3xl border border-slate-800">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Eye className="text-blue-500" /> 3. Partage des données</h2>
            <p><strong>Nous ne vendrons, ne louerons et ne partagerons jamais</strong> vos informations personnelles ou les données de vos CV à des tiers à des fins commerciales ou publicitaires. Vos données vous appartiennent à 100%.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Privacy;