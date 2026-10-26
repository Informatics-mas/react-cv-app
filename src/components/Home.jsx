import React from 'react';
import Link from 'next/link';
import { ArrowRight, Upload } from 'lucide-react';

const benefits = [
  {
    title: 'Compatible ATS',
    desc: "Tous les modèles, même les plus créatifs, gardent un texte extractible par les robots d'analyse.",
  },
  {
    title: 'Import par IA',
    desc: "Déposez votre ancien PDF : le contenu arrive dans l'éditeur (plans Basic et Premium).",
  },
  {
    title: 'Changez de modèle à tout moment',
    desc: "Vos données s'adaptent automatiquement au nouveau design, sans tout ressaisir.",
  },
  {
    title: 'Paiement local',
    desc: 'Mobile Money (Orange, MTN, Wave, Moov) ou carte. Aucun renouvellement automatique.',
  },
];

const steps = [
  {
    title: 'Choisissez un modèle',
    desc: 'Parcourez la galerie et sélectionnez le style qui correspond à votre métier.',
  },
  {
    title: 'Remplissez ou importez',
    desc: 'Saisissez vos expériences, formations et compétences, ou importez votre ancien CV.',
  },
  {
    title: 'Téléchargez en PDF',
    desc: 'Un PDF A4 haute qualité, en un clic, depuis votre téléphone ou votre ordinateur.',
  },
];

const motionCss = `
.cv-back{transform:rotate(6deg)}
.cv-main{transform:rotate(-3deg)}
@media (prefers-reduced-motion: no-preference){
  .rise{animation:rise .7s cubic-bezier(.2,.7,.2,1) both;animation-delay:var(--d,0s)}
  .cv-back{animation:cvBack .9s cubic-bezier(.2,.7,.2,1) .25s both}
  .cv-main{animation:cvMain .9s cubic-bezier(.2,.7,.2,1) .1s both}
  .bar{transform-origin:left center;animation:fill .5s ease-out both;animation-delay:var(--d,0s)}
  .pop{animation:pop .45s cubic-bezier(.3,1.5,.5,1) 2.3s both}
}
@keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes cvMain{from{opacity:0;transform:translateY(28px) rotate(-3deg)}to{opacity:1;transform:translateY(0) rotate(-3deg)}}
@keyframes cvBack{from{opacity:0;transform:translateX(-48px) rotate(0deg)}to{opacity:1;transform:translateX(0) rotate(6deg)}}
@keyframes fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes pop{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
`;

// Ligne de CV qui se "remplit" ; d = délai en secondes
const Bar = ({ className, d }) => (
  <div className={`bar ${className}`} style={{ '--d': `${d}s` }} />
);

function CvPreview() {
  return (
    <div className="relative w-full max-w-sm mx-auto h-[440px]" aria-hidden="true">
      {/* Deuxième modèle en arrière-plan */}
      <div className="cv-back absolute top-8 right-4 w-64 h-[360px] bg-slate-200 rounded-xl p-6 flex flex-col gap-2.5">
        <Bar d={0.9} className="h-3.5 w-3/5 bg-slate-400 rounded" />
        <Bar d={1.0} className="h-2 w-11/12 bg-slate-300 rounded" />
        <Bar d={1.1} className="h-2 w-3/4 bg-slate-300 rounded" />
      </div>

      {/* Modèle principal */}
      <div className="cv-main absolute top-0 left-4 w-72 h-[400px] bg-white text-slate-900 rounded-xl p-7 flex flex-col gap-3 shadow-2xl shadow-black/40">
        <div className="font-extrabold text-xl">Prénom Nom</div>
        <div className="text-xs text-slate-600 -mt-2">Intitulé du poste</div>
        <Bar d={0.9} className="h-[3px] w-10 bg-blue-600 rounded" />
        <div className="text-[10px] font-extrabold tracking-widest text-blue-600">EXPÉRIENCE</div>
        <Bar d={1.1} className="h-2 w-5/6 bg-slate-300 rounded" />
        <Bar d={1.2} className="h-2 w-11/12 bg-slate-200 rounded" />
        <Bar d={1.3} className="h-2 w-2/3 bg-slate-200 rounded" />
        <div className="text-[10px] font-extrabold tracking-widest text-blue-600 mt-2">FORMATION</div>
        <Bar d={1.5} className="h-2 w-4/5 bg-slate-300 rounded" />
        <Bar d={1.6} className="h-2 w-3/5 bg-slate-200 rounded" />
        <div className="text-[10px] font-extrabold tracking-widest text-blue-600 mt-2">COMPÉTENCES</div>
        <div className="flex gap-1.5 flex-wrap">
          <Bar d={1.8} className="h-[18px] w-14 bg-blue-100 rounded-full" />
          <Bar d={1.9} className="h-[18px] w-[70px] bg-blue-100 rounded-full" />
          <Bar d={2.0} className="h-[18px] w-11 bg-blue-100 rounded-full" />
        </div>
      </div>

      <div className="pop absolute bottom-4 left-0 bg-emerald-900 text-emerald-200 px-4 py-2.5 rounded-full text-xs font-extrabold">
        ATS : texte lisible ✓
      </div>
    </div>
  );
}

function Home() {
  return (
    <div className="min-h-full bg-[#0f172a] text-white font-sans antialiased flex flex-col overflow-x-hidden">
      <style>{motionCss}</style>
      {/* --- HERO --- */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-12 pb-16 lg:pt-16 lg:pb-24 flex flex-col lg:flex-row items-center gap-12 lg:gap-14">
        <div className="w-full lg:w-1/2 flex flex-col gap-6 text-center lg:text-left items-center lg:items-start">
          <span style={{ '--d': '0s' }} className="rise border border-slate-700 rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold text-blue-300">
            Compatible ATS · Export PDF A4
          </span>

          <h1 style={{ '--d': '0.1s' }} className="rise text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.05] tracking-tight">
            Un CV qui décroche <span className="text-blue-400">des entretiens</span>, prêt en 5 minutes.
          </h1>

          <p style={{ '--d': '0.2s' }} className="rise text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl">
            Choisissez un modèle, remplissez vos informations (ou importez votre ancien CV) et téléchargez un PDF
            lisible par les humains comme par les robots de recrutement.
          </p>

          <div style={{ '--d': '0.3s' }} className="rise flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link
              href="/create"
              className="group bg-blue-600 hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 text-white font-extrabold px-7 py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              Créer mon CV maintenant <ArrowRight size={18} className="shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
            </Link>
            <Link
              href="/create"
              className="border border-slate-600 hover:border-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300 text-white font-semibold px-7 py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Upload size={18} className="shrink-0" /> Importer mon CV
            </Link>
          </div>

          <p style={{ '--d': '0.4s' }} className="rise text-slate-400 text-sm">Plan gratuit : 5 téléchargements PDF inclus.</p>
        </div>

        <div className="w-full lg:w-1/2">
          <CvPreview />
        </div>
      </main>

      {/* --- AVANTAGES --- */}
      <section className="bg-[#131b2e] border-y border-slate-800/80 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col gap-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight max-w-2xl">
            Pensé pour passer les filtres et pour être payé simplement.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {benefits.map((b) => (
              <div key={b.title} className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-7 flex flex-col gap-2.5">
                <h3 className="font-extrabold text-lg">{b.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- ÉTAPES --- */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-16 sm:py-20 flex flex-col gap-10">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Trois étapes, un CV prêt à envoyer.
        </h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-3">
              <span className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center font-extrabold">
                {i + 1}
              </span>
              <h3 className="font-extrabold text-xl">{s.title}</h3>
              <p className="text-slate-300 leading-relaxed">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* --- APPEL À L'ACTION FINAL --- */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 pb-16 sm:pb-20">
        <div className="bg-blue-600 rounded-3xl px-6 py-14 flex flex-col items-center gap-5 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold">Prêt à créer votre CV ?</h2>
          <p className="text-blue-100 max-w-md leading-relaxed">Commencez gratuitement, sans engagement.</p>
          <Link
            href="/create"
            className="bg-white text-slate-900 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white font-extrabold px-8 py-4 rounded-xl transition-colors"
          >
            Créer mon CV maintenant
          </Link>
        </div>
      </section>
    </div>
  );
}

export default Home;