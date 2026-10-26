import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Un package-lock.json existe aussi dans le dossier parent : on force
  // la racine du workspace pour éviter l'inférence erronée de Next.js.
  outputFileTracingRoot: __dirname,
  // NB : les redirections des anciennes URLs (avec majuscules) vivent dans
  // middleware.js — celles de `redirects()` matchent insensible à la casse
  // et créeraient une boucle infinie (/home → /home).
};

export default nextConfig;
