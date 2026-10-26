import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Chargement de l'environnement AVANT tous les autres modules.
 * Les imports ESM sont évalués dans l'ordre de déclaration : ce module doit
 * rester le PREMIER import de server.js, sinon db/index.js et db/pool.js
 * liraient DATABASE_DRIVER / DATABASE_URL avant le chargement du .env.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });