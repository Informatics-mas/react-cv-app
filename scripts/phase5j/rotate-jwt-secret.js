#!/usr/bin/env node
/**
 * Phase 5J-A — A2 : rotation du JWT_SECRET dans l'environnement LOCAL contrôlé
 * (Backend/.env + .env, tous deux ignorés par Git).
 *
 * - génère un secret aléatoire de 64 octets (hex) ;
 * - remplace JWT_SECRET dans les DEUX fichiers (synchronisation front/back) ;
 * - N'AFFICHE JAMAIS de valeur de secret — uniquement des empreintes tronquées ;
 * - capture avant rotation un « témoin » signé avec l'ANCIEN secret, écrit dans
 *   /tmp (hors dépôt) pour le test de rejet post-rotation.
 *
 * Rollback (A4) : en cas d'échec, ne JAMAIS réactiver l'ancien secret — en
 * générer un autre avec ce même script.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, "../..");
const require = createRequire(path.join(ROOT, "Backend/package.json"));
const jwt = require("jsonwebtoken");

const ENV_FILES = [path.join(ROOT, "Backend/.env"), path.join(ROOT, ".env")];
const fp = (v) => crypto.createHash("sha256").update(String(v)).digest("hex").slice(0, 8);

const readSecret = (file) => {
  const m = fs.readFileSync(file, "utf8").match(/^JWT_SECRET=(.*)$/m);
  return m ? m[1].trim() : "";
};

const replaceSecret = (file, newValue) => {
  const content = fs.readFileSync(file, "utf8");
  const updated = content.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${newValue}`);
  fs.writeFileSync(file, updated, { mode: 0o600 });
};

// 1. Ancien secret → témoin de test (stocké dans /tmp, jamais dans le dépôt)
const oldSecret = readSecret(ENV_FILES[0]);
if (!oldSecret) {
  console.error("ERREUR : aucun JWT_SECRET courant — arrêt.");
  process.exit(1);
}
const oldToken = jwt.sign({ id: "rotation-probe", role: "user" }, oldSecret, { expiresIn: "10m", algorithm: "HS256" });
fs.writeFileSync("/tmp/phase5j-old-token.txt", oldToken, { mode: 0o600 });

// 2. Nouveau secret : 64 octets aléatoires (hex) → 128 caractères
const newSecret = crypto.randomBytes(64).toString("hex");

// 3. Écriture synchronisée dans les deux fichiers
for (const file of ENV_FILES) replaceSecret(file, newSecret);

console.log("ROTATION_TERMINEE");
console.log(`ancien_fp=${fp(oldSecret)} → nouveau_fp=${fp(newSecret)}`);
console.log(`fichiers_mis_a_jour=${ENV_FILES.length} (mode 0600)`);
console.log("temoin_ancien_token=/tmp/phase5j-old-token.txt (hors dépôt)");
console.log("VALEURS_NON_AFFICHEES=OK");
