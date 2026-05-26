const PricingCard = ({ plan }) => {
  return (
    <div className={`relative p-8 rounded-3xl border ${plan.isPopular ? 'border-blue-500 bg-blue-500/5' : 'border-slate-800 bg-slate-900/50'} backdrop-blur-xl transition-all hover:scale-105`}>
      {plan.isPopular && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider">
          Le plus populaire
        </span>
      )}
      
      <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-4xl font-extrabold text-white">{plan.price}</span>
        <span className="text-slate-400">XOF/{plan.duration}</span>
      </div>

      <ul className="space-y-4 mb-8">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3 text-slate-300 text-sm">
            <div className="text-emerald-500">✔</div>
            {feature}
          </li>
        ))}
      </ul>

      <button className={`w-full py-3 rounded-xl font-bold transition-all ${
        plan.isPopular 
        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
        : 'bg-slate-800 hover:bg-slate-700 text-white'
      }`}>
        {plan.buttonText}
      </button>
    </div>
  );
};