/**
 * Lot 4 — indépendance de la décision mock vis-à-vis du fournisseur PostgreSQL.
 *
 * Exécutable SANS base ni réseau :
 *   cd Backend && node --test tests/lot4-provider-independence.test.mjs
 *
 * T8  : URL PostgreSQL synthétique (Neon) sans signal Supabase → mock autorisé.
 * T9  : URL synthétique contenant « supabase » → MÊME décision que T8 (I4).
 *       NOTE : AVANT l'implémentation du Lot 4, ce test échoue VOLONTAIREMENT
 *       (le blocker /supabase/i refuse) — pré-état constaté et documenté dans
 *       BACKEND_PAYMENT_MOCK_GUARD_LOT4_REPORT.md. Assertion écrite pour
 *       l'état attendu APRÈS.
 * T10 : URL absente ou illisible → refus maintenu (blocker « illisible »).
 */
import test from "node:test";
import assert from "node:assert/strict";

const { resolvePaymentProvider, isMockActive, PaymentConfigError } = await import(
  new URL("../services/paymentProviders/index.js", import.meta.url).href
);

const ACK = "MOCK-TEST-ONLY";

/** Environnement de test autorisé — seule DATABASE_URL varie entre T8 et T9. */
function baseEnv(dbUrl) {
  return {
    PAYMENT_PROVIDER: "mock",
    NODE_ENV: "test",
    APP_ENV: "test",
    DATABASE_URL: dbUrl,
    DATABASE_DRIVER: "postgres",
    PAYMENT_MOCK_ENABLED: "true",
    PAYMENT_MOCK_ENV: "sandbox",
    PAYMENT_MOCK_ACK: ACK,
  };
}

// URL entièrement synthétiques (aucune connexion réelle, aucune valeur réelle)
const NEON_URL = "postgres://user:pass@ep-example-pooler.aws.neon.tech:5432/appdb";
const SUPABASE_URL = "postgres://user:pass@aws-0-eu-west-1.pooler.supabase.com:5432/appdb";

test("T8 — URL Neon synthétique + env test autorisé + ACK → mock autorisé", () => {
  const r = resolvePaymentProvider(baseEnv(NEON_URL));
  assert.equal(r.mock, true, "T8 : mock autorisé attendu");
  assert.equal(r.active, "mock");
  assert.equal(r.mode, "sandbox");
  assert.equal(isMockActive(baseEnv(NEON_URL)), true);
});

test("T9 — URL Supabase synthétique → MÊME décision que T8 (indépendance fournisseur)", () => {
  const r8 = resolvePaymentProvider(baseEnv(NEON_URL));
  const r9 = resolvePaymentProvider(baseEnv(SUPABASE_URL));
  assert.deepEqual(
    { mock: r9.mock, active: r9.active, mode: r9.mode },
    { mock: r8.mock, active: r8.active, mode: r8.mode },
    "T9 doit prendre exactement la même décision que T8"
  );
  assert.equal(isMockActive(baseEnv(SUPABASE_URL)), isMockActive(baseEnv(NEON_URL)));
});

test("T10 — URL absente ou illisible → refus maintenu", () => {
  for (const [label, url] of [
    ["absente", undefined],
    ["illisible", "not-a-url"],
    ["vide", ""],
  ]) {
    assert.throws(
      () => resolvePaymentProvider(baseEnv(url)),
      (err) => {
        assert.ok(err instanceof PaymentConfigError, `T10/${label} : PaymentConfigError`);
        assert.equal(err.code, "PAYMENT_CONFIG_INVALID", `T10/${label} : code`);
        assert.match(err.message, /illisible/, `T10/${label} : blocker « illisible » attendu`);
        return true;
      },
      `T10/${label} doit être refusée`
    );
    assert.equal(isMockActive(baseEnv(url)), false, `T10/${label} : isMockActive false`);
  }
});