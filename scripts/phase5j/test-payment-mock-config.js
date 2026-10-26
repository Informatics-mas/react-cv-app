#!/usr/bin/env node
/**
 * Lot 2G.4A.1 — tests de VERROUILLAGE PRODUCTION du mock de paiement.
 * 100 % unitaires : aucune connexion base, aucun serveur backend, aucune écriture.
 * Usage : node scripts/phase5j/test-payment-mock-config.js
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../Backend/package.json"));
const { resolvePaymentProvider, isMockActive } = await import(
  path.join(here, "../../Backend/services/paymentProviders/index.js")
);

let failures = 0;
const check = (n, ok, d) => { if (!ok) failures++; console.log(`${ok ? "PASS" : "FAIL"} | ${n} | ${d}`); };

const MOCK_BASE = {
  PAYMENT_PROVIDER: "mock",
  PAYMENT_MOCK_ENABLED: "true",
  PAYMENT_MOCK_ENV: "dev",
  DATABASE_DRIVER: "postgres",
  DATABASE_URL: "postgresql://x@db.example.com/cvc_rehearsal",
};
const expect = (label, env, want) => {
  // want: "actif" | "inactif" | "refus"
  let got;
  try {
    got = resolvePaymentProvider(env).mock ? "actif" : "inactif";
  } catch {
    got = "refus";
  }
  check(label, got === want, `obtenu=${got} attendu=${want}`);
};

// 1. Mock désactivé sans configuration
expect("CFG-1 configuration absente → inactif (503 conservé)", {}, "inactif");
expect("CFG-1b PAYMENT_PROVIDER=none → inactif", { PAYMENT_PROVIDER: "none" }, "inactif");

// 2-3. Activations valides (développement / test autorisé)
expect("CFG-2 activation valide NODE_ENV=development", { ...MOCK_BASE, NODE_ENV: "development" }, "actif");
expect("CFG-3 activation valide APP_ENV=test (sans NODE_ENV)", { ...MOCK_BASE, APP_ENV: "test" }, "actif");

// 4-5. Refus production
expect("CFG-4 NODE_ENV=production → REFUS sans exception", { ...MOCK_BASE, NODE_ENV: "production" }, "refus");
expect("CFG-5 APP_ENV=production → REFUS", { ...MOCK_BASE, NODE_ENV: "development", APP_ENV: "production" }, "refus");
expect("CFG-5b valeurs 'prod' → REFUS", { ...MOCK_BASE, NODE_ENV: "prod", APP_ENV: "prod" }, "refus");

// 6. Contradictions
expect("CFG-6 contradiction NODE_ENV=test + APP_ENV=production → REFUS", { ...MOCK_BASE, NODE_ENV: "test", APP_ENV: "production" }, "refus");
expect("CFG-6b PAYMENT_MOCK_ENV=prod (invalide) → REFUS", { ...MOCK_BASE, NODE_ENV: "development", PAYMENT_MOCK_ENV: "prod" }, "refus");
expect("CFG-6c NODE_ENV=staging (inconnu) → REFUS", { ...MOCK_BASE, NODE_ENV: "staging" }, "refus");

// 7. Signaux requis manquants
expect("CFG-7 AUCUN signal NODE_ENV/APP_ENV → REFUS (fail-closed)", { ...MOCK_BASE }, "refus");
expect("CFG-7b PAYMENT_MOCK_ENABLED manquant → REFUS", { ...MOCK_BASE, NODE_ENV: "development", PAYMENT_MOCK_ENABLED: undefined }, "refus");
expect("CFG-7c PAYMENT_MOCK_ENV manquant → REFUS", { ...MOCK_BASE, NODE_ENV: "development", PAYMENT_MOCK_ENV: undefined }, "refus");
expect("CFG-7d DATABASE_DRIVER != postgres → REFUS", { ...MOCK_BASE, NODE_ENV: "development", DATABASE_DRIVER: "mongo" }, "refus");

// 8. Cible explicitement production/Supabase
expect("CFG-8 DATABASE_URL Supabase → REFUS", { ...MOCK_BASE, NODE_ENV: "development", DATABASE_URL: "postgresql://x@aws.pooler.supabase.com/postgres" }, "refus");
expect("CFG-8b base 'postgres' → REFUS", { ...MOCK_BASE, NODE_ENV: "development", DATABASE_URL: "postgresql://x@db.example.com/postgres" }, "refus");

// 10. Aucun contournement par le seul nom de la base
expect("CFG-10 base 'neondb' + NODE_ENV=production → REFUS", { ...MOCK_BASE, NODE_ENV: "production", DATABASE_URL: "postgresql://x@ep-abc.aws.neon.tech/neondb" }, "refus");
expect("CFG-10b base 'neondb' sans signal non-productif → REFUS", { ...MOCK_BASE, DATABASE_URL: "postgresql://x@ep-abc.aws.neon.tech/neondb" }, "refus");
check("CFG-10c le nom de la base n'est jamais le signal (isMockActive=false en cas de refus)",
  isMockActive({ ...MOCK_BASE, DATABASE_URL: "postgresql://x@ep-abc.aws.neon.tech/neondb" }) === false, "isMockActive=false");

// 9. Routes développeur indisponibles en production (garde du routeur, sans DB)
{
  const savedEnv = { ...process.env };
  Object.assign(process.env, MOCK_BASE, { NODE_ENV: "production" });
  const express = require("express");
  const { default: mockRoutes } = await import(path.join(here, "../../Backend/Routes/paymentMockRoutes.js"));
  const app = express();
  app.use(express.json());
  // Montage inconditionnel dans le harnais : c'est la GARDE PAR ROUTE qui doit
  // refuser (filet de défense) — le montage conditionnel de server.js est
  // couvert par CFG-9 et par la revue de code.
  app.use("/api/payments/mock", mockRoutes);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const port = server.address().port;
  const post = (p) => fetch(`http://127.0.0.1:${port}${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  const rProd = await post("/api/payments/mock/dev/simulate");
  check("CFG-9 en production : route développeur INACCESSIBLE — 404 par la garde (avant toute auth/DB)", rProd.status === 404, `http=${rProd.status}`);

  // Contrôle symétrique : avec config de test valide, la route EXISTE (401 = protégée, pas 404)
  Object.assign(process.env, MOCK_BASE, { NODE_ENV: "development" });
  const rDev = await post("/api/payments/mock/dev/simulate");
  check("CFG-9b en développement : route présente et protégée (401, jamais ouverte)", rDev.status === 401, `http=${rDev.status}`);
  await new Promise((resolve) => server.close(resolve));
  process.env = savedEnv;
}

console.log(failures === 0 ? "\nBILAN CONFIG-MOCK: TOUS PASS" : `\nBILAN CONFIG-MOCK: ${failures} FAIL`);
process.exit(failures > 0 ? 1 : 0);
