import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Heart, Mail } from 'lucide-react';

function Footer() {
  return (
    <footer className="bg-[#0b0f19] border-t border-slate-900 pt-16 pb-8 text-sm mt-auto w-full z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap- 6 mb-16">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <FileText size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">CV.Craft</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              La plateforme ultime et intelligente pour structurer et créer des CV professionnels percutants.
            </p>
          </div>

          <div>
            <h4 className="font-bold mb-5 text-xs uppercase tracking-widest text-slate-300">Produit</h4>
            <ul className="space-y-3 text-slate-400 text-xs">
              <li><Link to="/Create" className="hover:text-white transition-colors">Créateur de CV</Link></li>
              <li><Link to="/Models" className="hover:text-white transition-colors">Modèles de CV</Link></li>
              <li><Link to="/Plans" className="hover:text-white transition-colors">Tarifs</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-5 text-xs uppercase tracking-widest text-slate-300">Aide</h4>
            <ul className="space-y-3 text-slate-400 text-xs">
              <li><Link to="/FAQ" className="hover:text-white transition-colors">FAQ</Link></li>
              <li><a href="mailto:ogouogoudavid@gmail.com" className="hover:text-white transition-colors">Support technique</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-5 text-xs uppercase tracking-widest text-slate-300">A propos de nous</h4>
            <ul className="space-y-3 text-slate-400 text-xs">
              <li><Link to="Privacy" className="hover:text-white transition-colors">Condition d'utilisation</Link></li>
              <li><Link to="Terms" className="hover:text-white transition-colors">Politique de confidentialité</Link></li>
              <li><Link to="About" className="hover:text-white transition-colors">A propos de nous</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-5 text-xs uppercase tracking-widest text-slate-300">Contact</h4>
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Mail size={14} className="text-slate-500" />
              <span>ogouogoudavid@gmail.com</span>
            </div>
          </div>
          
        </div>

        <div className="border-t border-slate-900 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-xs">© 2026 CV.Craft. Tous droits réservés.</p>
          <p className="text-slate-500 text-xs flex items-center gap-1">
            Fait avec <Heart size={12} className="text-red-500 fill-red-500" /> par Informatics
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;