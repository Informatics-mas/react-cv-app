/**
 * Lot 2 — tests de l'autorisation explicite PAYMENT_MOCK_ACK.
 *
 * Exécutable SANS base ni réseau :
 *   cd Backend && node --test tests/lot2-payment-mock-ack.test.mjs
 *
 * Matrice (15 cas) — validation stricte (égalité exacte), production toujours
 * bloquée, ordre de validation (prod → signal positif → ACK → autres), deux
 * niveaux (assertPaymentConfig au démarrage / isMockActive à l'exécution).
 */
import test from "node:test";
import assert from "node:assert/strict";

const { resolvePaymentProvider, isMockActive, assertPaymentConfig, PaymentConfigError } =
  await import(new URL("../services/paymentProviders/index.js", import.meta.url).href);

const ACK = "MOCK-TEST-ONLY";

/** Environnement valide de référence (développement). */
function baseEnv(overrides = {}) {
  return {
    PAYMENT_PROVIDER: "mock",
    NODE_ENV: "development",
    APP_ENV: "development",
    DATABASE_URL: "postgres://user:pass@127.0.0.1:5432/appdb",
    DATABASE_DRIVER: "postgres",
    PAYMENT_MOCK_ENABLED: "true",
    PAYMENT_MOCK_ENV: "dev",
    PAYMENT_MOCK_ACK: ACK,
    ...overrides,
  };
}

function rejects(env, label) {
  assert.throws(
    () => resolvePaymentProvider(env),
    (err) => {
      assert.ok(err instanceof PaymentConfigError, `${label} : PaymentConfigError attendu`);
      assert.equal(err.code, "PAYMENT_CONFIG_INVALID", `${label} : code attendu`);
      return true;
    },
    label
  );
  assert.equal(isMockActive(env), false, `${label} : isMockActive doit être false`);
}

// --- Production toujours bloquée (règle impérative) ---

test("T2-01 Production + ACK valide → Mock refusé", () => {
  rejects(baseEnv({ NODE_ENV: "production", APP_ENV: "production" }), "T2-01");
});

test("T2-02 Production + ACK absent → Mock refusé", () => {
  const env = baseEnv({ NODE_ENV: "production", APP_ENV: "production" });
  delete env.PAYMENT_MOCK_ACK;
  rejects(env, "T2-02");
});

// --- Autorisations possibles (env non-productif reconnu + ACK + autres) ---

test("T2-03 test reconnu + ACK valide + autres conditions → autorisation possible", () => {
  const r = resolvePaymentProvider(baseEnv({ NODE_ENV: "test", APP_ENV: "test", PAYMENT_MOCK_ENV: "sandbox" }));
  assert.equal(r.mock, true);
  assert.equal(r.active, "mock");
});

test("T2-04 développement reconnu + ACK valide + autres conditions → autorisation possible", () => {
  const r = resolvePaymentProvider(baseEnv());
  assert.equal(r.mock, true);
  assert.equal(r.active, "mock");
  assert.equal(r.mode, "dev");
});

// --- Validation stricte de l'ACK ---

test("T2-05 ACK absente → Refus", () => {
  const env = baseEnv();
  delete env.PAYMENT_MOCK_ACK;
  rejects(env, "T2-05");
});

test("T2-06 ACK vide → Refus", () => {
  rejects(baseEnv({ PAYMENT_MOCK_ACK: "" }), "T2-06");
});

test("T2-07 ACK incorrecte → Refus", () => {
  rejects(baseEnv({ PAYMENT_MOCK_ACK: "AUTRE-VALEUR" }), "T2-07");
});

test("T2-08 ACK MOCK-TEST-ONLY-extra → Refus (texte supplémentaire en suffixe)", () => {
  rejects(baseEnv({ PAYMENT_MOCK_ACK: "MOCK-TEST-ONLY-extra" }), "T2-08");
});

test("T2-09 ACK prefix-MOCK-TEST-ONLY → Refus (texte supplémentaire en préfixe)", () => {
  rejects(baseEnv({ PAYMENT_MOCK_ACK: "prefix-MOCK-TEST-ONLY" }), "T2-09");
});

test("T2-10 ACK contenant la valeur + texte supplémentaire (espaces) → Refus", () => {
  rejects(baseEnv({ PAYMENT_MOCK_ACK: " MOCK-TEST-ONLY" }), "T2-10a");
  rejects(baseEnv({ PAYMENT_MOCK_ACK: "MOCK-TEST-ONLY " }), "T2-10b");
  rejects(baseEnv({ PAYMENT_MOCK_ACK: "MOCK-TEST-ONLY\n" }), "T2-10c");
});

// --- Environnements ---

test("T2-11 Environnement inconnu + ACK valide → Refus sûr", () => {
  rejects(baseEnv({ NODE_ENV: "staging", APP_ENV: "staging" }), "T2-11");
});

test("T2-12 Environnement contradictoire ou ambigu + ACK valide → Refus sûr", () => {
  rejects(baseEnv({ NODE_ENV: "production", APP_ENV: "development" }), "T2-12a (contradictoire)");
  rejects(baseEnv({ NODE_ENV: "unknown", APP_ENV: "" }), "T2-12b (ambigu)");
  const env = baseEnv();
  delete env.NODE_ENV;
  delete env.APP_ENV;
  rejects(env, "T2-12c (absents)");
});

// --- Blocages existants préservés ---

test("T2-13 Un bloqueur existant reste actif + ACK valide → Refus", () => {
  rejects(baseEnv({ PAYMENT_MOCK_ENABLED: "false" }), "T2-13a (ENABLED)");
  rejects(baseEnv({ PAYMENT_MOCK_ENV: "prod" }), "T2-13b (ENV invalide)");
  rejects(baseEnv({ DATABASE_DRIVER: "mongo" }), "T2-13c (driver)");
  // T2-13d — Lot 4 (I4) : le blocker « nom de base 'postgres' » a été RETIRÉ ;
  // le nom de la base ne doit PLUS influer sur la décision (égalité stricte
  // avec la référence appdb) — assertion alignée sur la spécification Lot 4.
  const rDbName = resolvePaymentProvider(
    baseEnv({ DATABASE_URL: "postgres://u:p@h:5432/postgres" })
  );
  const rAppDb = resolvePaymentProvider(baseEnv());
  assert.deepEqual(rDbName, rAppDb, "T2-13d : le nom de base ne doit plus influer sur la décision");
});

// --- Deux niveaux de validation ---

test("T2-14 Valide au démarrage puis invalide à l'exécution → Refus à l'exécution", () => {
  // Démarrage : configuration complète → OK
  assert.equal(assertPaymentConfig(baseEnv()).mock, true);
  // Exécution : la configuration devient invalide (ACK retirée) → refus
  const envRuntime = baseEnv();
  delete envRuntime.PAYMENT_MOCK_ACK;
  assert.equal(isMockActive(envRuntime), false, "refus à l'exécution attendu");
  assert.throws(() => resolvePaymentProvider(envRuntime), PaymentConfigError);
});

test("T2-15 Configuration invalide au démarrage → Échec sécurisé (fail-closed)", () => {
  assert.throws(
    () => assertPaymentConfig(baseEnv({ PAYMENT_MOCK_ACK: "incorrect" })),
    (err) => err instanceof PaymentConfigError && err.code === "PAYMENT_CONFIG_INVALID"
  );
  // Sans fournisseur : comportement neutre inchangé (no-provider)
  const r = resolvePaymentProvider({ PAYMENT_PROVIDER: "none" });
  assert.equal(r.mock, false);
});