/**
 * Lot 5 — tests unitaires de la politique de paiement.
 *
 * Exécutable SANS base, SANS réseau, SANS serveur :
 *   cd Backend && node --test tests/paymentProvider.policy.test.mjs
 *
 * T11 — fournisseur réel indisponible (GeniusPay) → exception déterministe,
 *       JAMAIS de fallback vers le mock. Comportement vérifié dans le code
 *       réel : index.js:31-33 (PaymentConfigError, message « GeniusPay n'est
 *       pas encore intégré (aucun client, aucune signature, aucun webhook) »).
 *
 * Consolidation — cartographie de couverture T1-T7, T10, T15 : les cas sont
 * couverts par les suites existantes (lot2/lot3/lot4) ; ce fichier atteste
 * leur présence SANS dupliquer leurs assertions.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { resolvePaymentProvider, isMockActive, PaymentConfigError } = await import(
  new URL("../services/paymentProviders/index.js", import.meta.url).href
);

const ACK = "MOCK-TEST-ONLY";

/** Config de test par ailleurs complète (seul PAYMENT_PROVIDER varie). */
function baseEnv(overrides = {}) {
  return {
    PAYMENT_PROVIDER: "mock",
    NODE_ENV: "test",
    APP_ENV: "test",
    DATABASE_URL: "postgres://user:pass@127.0.0.1:5432/appdb",
    DATABASE_DRIVER: "postgres",
    PAYMENT_MOCK_ENABLED: "true",
    PAYMENT_MOCK_ENV: "sandbox",
    PAYMENT_MOCK_ACK: ACK,
    ...overrides,
  };
}

// --- T11 : GeniusPay — exception déterministe, aucun fallback ---

test("T11-a PAYMENT_PROVIDER=geniuspay → PaymentConfigError explicite", () => {
  assert.throws(
    () => resolvePaymentProvider(baseEnv({ PAYMENT_PROVIDER: "geniuspay" })),
    (err) => {
      assert.ok(err instanceof PaymentConfigError, "PaymentConfigError attendu");
      assert.equal(err.name, "PaymentConfigError");
      assert.equal(err.code, "PAYMENT_CONFIG_INVALID");
      assert.match(err.message, /GeniusPay n'est pas encore intégré/, "message d'erreur exact attendu");
      assert.match(err.message, /aucun client, aucune signature, aucun webhook/, "comportement documenté");
      return true;
    }
  );
});

test("T11-b geniuspay même avec ACK valide + env test → toujours refusé (pas de bypass)", () => {
  // La sélection du fournisseur est évaluée AVANT les blockers mock :
  // aucune combinaison d'ACK/env ne peut faire tomber GeniusPay sur le mock.
  assert.throws(() => resolvePaymentProvider(baseEnv({ PAYMENT_PROVIDER: "geniuspay" })), PaymentConfigError);
  assert.equal(isMockActive(baseEnv({ PAYMENT_PROVIDER: "geniuspay" })), false, "isMockActive doit être false");
});

test("T11-c Aucun fallback : jamais de résolution {mock:true} hors config mock valide", () => {
  // geniuspay → exception ; inconnu → exception ; none → mock:false
  for (const provider of ["geniuspay", "stripe", "paypal-xyz"]) {
    assert.throws(
      () => resolvePaymentProvider(baseEnv({ PAYMENT_PROVIDER: provider })),
      PaymentConfigError,
      `provider '${provider}' doit lever une exception (aucun fallback)`
    );
    assert.equal(isMockActive(baseEnv({ PAYMENT_PROVIDER: provider })), false, provider);
  }
  const none = resolvePaymentProvider(baseEnv({ PAYMENT_PROVIDER: "none" }));
  assert.deepEqual(none, { active: null, mock: false, reason: "no-provider" }, "none = neutre");
  assert.equal(isMockActive(baseEnv({ PAYMENT_PROVIDER: "none" })), false);
});

test("T11-d Fournisseur inconnu → message explicite (traçabilité)", () => {
  assert.throws(
    () => resolvePaymentProvider(baseEnv({ PAYMENT_PROVIDER: "stripe" })),
    (err) => {
      assert.ok(err instanceof PaymentConfigError);
      assert.match(err.message, /inconnu/, "message « inconnu » attendu");
      return true;
    }
  );
});

// --- Consolidation : cartographie T1-T7, T10, T15 (sans duplication) ---

test("Consolidation — les cas T1-T7, T10, T15 sont couverts par les suites existantes", () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const lot2 = fs.readFileSync(path.join(__dirname, "lot2-payment-mock-ack.test.mjs"), "utf8");
  const lot3 = fs.readFileSync(path.join(__dirname, "lot3-payment-config-hardening.test.mjs"), "utf8");
  const lot4 = fs.readFileSync(path.join(__dirname, "lot4-provider-independence.test.mjs"), "utf8");
  // T1 prod+ACK absente / T2 prod+ACK valide / T5 ACK absente / T7 ACK incorrecte
  for (const tag of ["T2-01", "T2-02", "T2-05", "T2-07"]) {
    assert.ok(lot2.includes(tag), `couverture ${tag} présente (lot2)`);
  }
  // T3 env inconnu / T4 contradictoire
  assert.ok(lot2.includes("T2-11"), "couverture T3 (env inconnu, lot2)");
  assert.ok(lot3.includes("Lot3-2"), "couverture T4 (contradictoire, lot3)");
  // T6 dev + ACK valide / T7 test + ACK valide
  assert.ok(lot2.includes("T2-04"), "couverture T6 (dev, lot2)");
  assert.ok(lot2.includes("T2-03"), "couverture T7 (test, lot2)");
  // T10 URL absente/illisible
  assert.ok(lot4.includes("T10"), "couverture T10 (lot4)");
  // T15 ACK sous-chaîne
  for (const tag of ["T2-08", "T2-09", "T2-10"]) {
    assert.ok(lot2.includes(tag), `couverture T15 (${tag}, lot2)`);
  }
});