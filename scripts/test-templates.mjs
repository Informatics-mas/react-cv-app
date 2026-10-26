#!/usr/bin/env node
/**
 * Test de non-régression — synchronisation modèle ↔ rendu du CV.
 * Contexte : le changement de modèle sélectionné n'actualisait pas l'aperçu.
 *
 * Vérifie, sans navigateur :
 *  1. chaque modèle proposé dans la galerie (Models.jsx → CV_MODELS) possède
 *     une entrée dans TEMPLATES_MAP (Create.jsx) ;
 *  2. chaque entrée de TEMPLATES_MAP pointe vers un fichier de template importé
 *     et existant ;
 *  3. les fichiers de templates sont DISTINCTS (pas de doublon déguisé — deux
 *     "modèles" différents ne doivent jamais produire le même rendu).
 *
 * Usage : node scripts/test-templates.mjs
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(root, p), "utf8");

const createSrc = read("src/components/Create.jsx");
const modelsSrc = read("src/components/Models.jsx");

// --- 1. Clés de TEMPLATES_MAP (Create.jsx) ---
const mapBlock = createSrc.match(/const TEMPLATES_MAP = \{([\s\S]*?)\};/);
if (!mapBlock) {
  console.error("❌ TEMPLATES_MAP introuvable dans src/components/Create.jsx");
  process.exit(1);
}
const mapEntries = [...mapBlock[1].matchAll(/(\w+)\s*:\s*(\w+)/g)].map((m) => ({
  id: m[1],
  component: m[2],
}));

// --- 2. Ids proposés par la galerie (Models.jsx → CV_MODELS) ---
const galleryIds = [...modelsSrc.matchAll(/\{\s*id:\s*'([^']+)'/g)].map((m) => m[1]);

let failures = 0;

for (const id of galleryIds) {
  const entry = mapEntries.find((e) => e.id === id);
  if (!entry) {
    console.error(`❌ id galerie '${id}' absent de TEMPLATES_MAP → fallback ModernTemplate`);
    failures++;
  } else {
    console.log(`✅ '${id}' → ${entry.component}`);
  }
}

// --- 3. Existence des fichiers de templates importés par Create.jsx ---
const importMatches = [...createSrc.matchAll(/import \w+ from '\.\/models\/(\w+)';/g)];
for (const [, file] of importMatches) {
  if (!existsSync(path.join(root, `src/components/models/${file}.jsx`))) {
    console.error(`❌ fichier de template manquant : src/components/models/${file}.jsx`);
    failures++;
  }
}
if (importMatches.length !== mapEntries.length) {
  console.error(
    `❌ ${mapEntries.length} entrées TEMPLATES_MAP mais ${importMatches.length} imports './models/*' — mapping incohérent`
  );
  failures++;
}

// --- 4. Distinction réelle des fichiers de templates (hash) ---
const dir = path.join(root, "src/components/models");
const hashes = new Map();
const files = readdirSync(dir).filter((f) => f.endsWith(".jsx"));
for (const f of files) {
  const h = createHash("md5").update(readFileSync(path.join(dir, f))).digest("hex");
  if (hashes.has(h)) {
    console.error(`❌ ${f} est octet pour octet identique à ${hashes.get(h)} — rendu dupliqué`);
    failures++;
  }
  hashes.set(h, f);
}

if (failures) {
  console.error(`\n${failures} problème(s) détecté(s).`);
  process.exit(1);
}
console.log(
  `\n✅ OK — ${galleryIds.length} modèles galerie, ${mapEntries.length} entrées TEMPLATES_MAP, ${files.length} fichiers de templates distincts.`
);