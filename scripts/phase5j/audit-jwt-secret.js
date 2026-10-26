#!/usr/bin/env node
/**
 * Phase 5J-A — A1 : comparaison par EMPREINTE du secret JWT courant avec celui
 * de l'historique Git (commit 020d8f8). Aucune valeur n'est affichée ni stockée :
 * uniquement « IDENTIQUE » ou « DIFFERENT » + longueur de l'empreinte.
 */
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../Backend/package.json"));
require("dotenv").config({ path: path.join(here, "../../Backend/.env") });

const fp = (v) => (v ? crypto.createHash("sha256").update(String(v)).digest("hex") : null);

const current = process.env.JWT_SECRET || "";

// Extraction du .env historique SANS affichage (tampon mémoire uniquement).
let historical = "";
try {
  const buf = execSync("git show 020d8f8:.env", {
    cwd: path.join(here, "../.."),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  });
  const m = buf.match(/^JWT_SECRET=(.*)$/m);
  historical = m ? m[1].trim() : "";
} catch {
  console.log("HISTORIQUE: .env introuvable au commit 020d8f8");
}

console.log(`secret_courant_present   = ${current.length > 0}`);
console.log(`secret_historique_present= ${historical.length > 0}`);
console.log(`secret_courant_longueur  = ${current.length} (valeur non affichée)`);
console.log(`comparaison              = ${fp(current) === fp(historical) ? "IDENTIQUE (secret compromis EN USAGE)" : "DIFFERENT"}`);

// Vérification de robustesse du secret courant (longueur + classe de caractères).
const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(current)).length;
const ok = current.length >= 64 && classes >= 1;
console.log(`robustesse (>=64 car.)   = ${ok ? "OK" : "INSUFFISANT — rotation requise"} (longueur=${current.length}, classes=${classes})`);
