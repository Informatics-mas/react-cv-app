/**
 * Lot 1bis (risque R1) — tests du verrou de souscription payante.
 *
 * Exécutable SANS base ni service externe :
 *   cd Backend && node --test tests/
 *
 * T17a : subscribe() refuse un plan payant AVANT toute écriture (garde posé
 *        avant withTransaction → aucune connexion n'est tentée).
 * T17b : invariant source — plus aucune création de paiement 'succeeded'
 *        ni de référence SUB-<id> dans le module.
 * T19  : convention MOCK- / SUB- documentée dans le module.
 * T14  : resolvePaymentMethod — whitelist et refus par défaut.
 *
 * T18 (route /subscribe → 503 sans mock) = test d'intégration nécessitant
 * une base dédiée — NON exécuté ici (signalé dans le rapport).
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Environnement factice : évite le fail-fast de db/pool.js à l'import,
// sans JAMAIS contacter de base (le pool est paresseux et les tests
// ci-dessous déclenchent le refus avant toute requête).
process.env.DATABASE_DRIVER = "postgres";
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgres://test:test@127.0.0.1:1/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoPath = path.join(__dirname, "..", "db", "repositories", "subscriptions.js");
const source = fs.readFileSync(repoPath, "utf8");

const { subsRepo, resolvePaymentMethod } = await import(
  new URL("../db/repositories/subscriptions.js", import.meta.url).href
);

test("T17a — subscribe() refuse un plan payant avant toute écriture", async () => {
  await assert.rejects(
    () =>
      subsRepo.subscribe({
        user: { _id: 1 },
        plan: { name: "Premium", price: 9.99 },
        startDate: new Date(),
        endDate: new Date(),
      }),
    (err) => {
      assert.equal(err.code, "PAYMENT_PROVIDER_REQUIRED");
      return true;
    }
  );
});

test("T17a-bis — le refus couvre aussi un prix sous forme de chaîne", async () => {
  await assert.rejects(
    () =>
      subsRepo.subscribe({
        user: { _id: 1 },
        plan: { name: "Basic", price: "9.99" },
        startDate: new Date(),
        endDate: new Date(),
      }),
    (err) => err.code === "PAYMENT_PROVIDER_REQUIRED"
  );
});

test("T17b — invariant source : aucun paiement 'succeeded' ni référence SUB- générée", () => {
  assert.ok(!/status:\s*["']succeeded["']/.test(source), "status succeeded doit avoir disparu");
  assert.ok(!/SUB-\$\{/.test(source), "la génération de référence SUB-<id> doit avoir disparu");
  assert.ok(!/paymentsRepo/.test(source), "plus d'usage de paymentsRepo dans ce module");
});

test("T19 — convention MOCK- / SUB- documentée dans le module", () => {
  assert.ok(/MOCK-/.test(source), "convention MOCK- documentée");
  assert.ok(/SUB-/.test(source), "convention SUB- documentée");
  assert.ok(/processPaymentOutcome/.test(source), "référence au traitement serveur autorisé");
});

test("T14 — resolvePaymentMethod : whitelist et refus par défaut", () => {
  assert.equal(resolvePaymentMethod("card"), "card");
  assert.equal(resolvePaymentMethod("paypal"), "paypal");
  assert.equal(resolvePaymentMethod("wave"), "wave");
  assert.equal(resolvePaymentMethod("mobile", { provider: "orange" }), "orange_money");
  assert.equal(resolvePaymentMethod("mobile", { provider: "mtn" }), "mtn_money");
  assert.equal(resolvePaymentMethod("mobile", { provider: "wave" }), "wave");
  assert.equal(resolvePaymentMethod("inconnu", {}), null);
  assert.equal(resolvePaymentMethod("mobile", { provider: "inconnu" }), null);
  assert.equal(resolvePaymentMethod(undefined, undefined), null);
});