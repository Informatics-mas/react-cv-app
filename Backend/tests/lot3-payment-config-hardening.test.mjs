/**
 * Lot 3 — renforcement du validateur : avertissement des configurations
 * mixtes + vérification des invariants d'environnement.
 *
 * Exécutable SANS base ni réseau :
 *   cd Backend && node --test tests/lot3-payment-config-hardening.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";

const {
  resolvePaymentProvider,
  isMockActive,
  assertPaymentConfig,
  warnMixedPaymentConfig,
  PaymentConfigError,
} = await import(new URL("../services/paymentProviders/index.js", import.meta.url).href);

const ACK = "MOCK-TEST-ONLY";

function baseEnv(overrides = {}) {
  return {
    PAYMENT_PROVIDER: "mock",
    NODE_ENV: "development",
    APP_ENV: "development",
    DATABASE_URL: "postgres://user:s3cret@127.0.0.1:5432/appdb",
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
    (err) => err instanceof PaymentConfigError && err.code === "PAYMENT_CONFIG_INVALID",
    label
  );
  assert.equal(isMockActive(env), false, `${label} : isMockActive false`);
}

// 1. Production + ACK valide : refus maintenu
test("Lot3-1 Production + ACK valide → refus maintenu", () => {
  rejects(baseEnv({ NODE_ENV: "production", APP_ENV: "production" }), "Lot3-1");
});

// 2. Contradictoire : le blocage production l'emporte
test("Lot3-2 NODE_ENV=production + APP_ENV=development → refus maintenu", () => {
  rejects(baseEnv({ NODE_ENV: "production", APP_ENV: "development" }), "Lot3-2");
});

// 3. Les deux absents : aucune autorisation implicite
test("Lot3-3 NODE_ENV et APP_ENV absents → refus maintenu", () => {
  const env = baseEnv();
  delete env.NODE_ENV;
  delete env.APP_ENV;
  rejects(env, "Lot3-3");
});

// 4. Environnement inconnu : refus maintenu
test("Lot3-4 Environnement inconnu → refus maintenu", () => {
  rejects(baseEnv({ NODE_ENV: "staging", APP_ENV: "staging" }), "Lot3-4");
});

// 5. Env non productif reconnu + ACK + autres : comportement préservé
test("Lot3-5 Env non productif + ACK valide + conditions → mock autorisé (inchangé)", () => {
  const r = resolvePaymentProvider(baseEnv());
  assert.equal(r.mock, true);
  assert.equal(r.active, "mock");
});

// 6. Configuration mixte : avertissement attendu, SANS activation du mock
test("Lot3-6 Config mixte → avertissement émis et mock NON activé", () => {
  const logs = [];
  const env = baseEnv({ NODE_ENV: "production", APP_ENV: "production" });
  const warned = warnMixedPaymentConfig(env, (msg) => logs.push(msg));
  assert.equal(warned, true, "avertissement attendu");
  assert.equal(logs.length, 1, "exactement un message");
  assert.match(logs[0], /Configuration mixte/);
  assert.match(logs[0], /REFUSÉ/);
  // Le mock n'est JAMAIS activé par l'avertissement
  rejects(env, "Lot3-6 : le mock doit rester refusé");
  // Pas d'avertissement en configuration homogène (dev)
  const logsDev = [];
  assert.equal(warnMixedPaymentConfig(baseEnv(), (m) => logsDev.push(m)), false);
  assert.equal(logsDev.length, 0, "aucun log inutile en dev");
});

// 7. Le message ne contient ni URL de base ni secret
test("Lot3-7 Message expurgé : ni URL, ni secret, ni valeur de configuration", () => {
  const logs = [];
  const env = baseEnv({ NODE_ENV: "production", APP_ENV: "production" });
  warnMixedPaymentConfig(env, (msg) => logs.push(msg));
  const msg = logs[0];
  assert.ok(!msg.includes("postgres://"), "aucune URL de base");
  assert.ok(!msg.includes("s3cret"), "aucun mot de passe");
  assert.ok(!msg.includes(env.DATABASE_URL), "aucune valeur DATABASE_URL");
  assert.ok(!msg.includes(ACK), "aucune valeur ACK");
  assert.ok(!/Bearer|token|jwt/i.test(msg), "aucun token");
});

// 8. Config invalide au démarrage : comportement fail-fast conservé
test("Lot3-8 assertPaymentConfig fail-fast + avertissement en config mixte", () => {
  // Config invalide au démarrage → PaymentConfigError (fail-fast)
  assert.throws(
    () => assertPaymentConfig(baseEnv({ PAYMENT_MOCK_ACK: "incorrect" })),
    (err) => err instanceof PaymentConfigError && err.code === "PAYMENT_CONFIG_INVALID"
  );
  // Config mixte au démarrage → avertissement (console.warn par défaut) ET échec
  const logs = [];
  const env = baseEnv({ NODE_ENV: "production", APP_ENV: "production" });
  assert.throws(
    () => assertPaymentConfig({ ...env, __log: undefined }) && warnMixedPaymentConfig(env, (m) => logs.push(m)),
    PaymentConfigError
  );
  // Vérification directe : warnMixedPaymentConfig retourne true sur config mixte
  assert.equal(warnMixedPaymentConfig(env, (m) => logs.push(m)), true);
  assert.equal(logs.length, 1);
  // Démarrage valide → résolution OK
  assert.equal(assertPaymentConfig(baseEnv()).mock, true);
});