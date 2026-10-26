/**
 * Adaptateur MOCK du prestataire de paiement (Lot 2G) — TEST UNIQUEMENT.
 *
 * Simulation PURE : aucun appel réseau, aucune clé API, aucune écriture en base.
 * Un résultat simulé est un AVIS destiné aux tests — jamais une preuve de
 * paiement réel, jamais réutilisable pour un paiement GeniusPay.
 */
export const MOCK_SCENARIOS = [
  "success",
  "declined",
  "cancelled",
  "pending",
  "timeout",
  "provider_error",
  "duplicate_notification",
  "invalid_notification",
];

/** Scénarios ouverts au parcours sandbox (comptes ordinaires, sur LEUR intent). */
export const SANDBOX_OUTCOMES = ["success", "declined", "cancelled", "pending"];

const NOTICE = "MODE TEST — AUCUN PAIEMENT RÉEL N'A ÉTÉ EFFECTUÉ";

export function createMockIntent({ reference, amount, currency }) {
  return {
    provider: "mock",
    mock: true,
    intentId: reference,
    status: "pending",
    amount,
    currency,
    checkoutUrl: `/payment-sim?reference=${encodeURIComponent(reference)}`,
    notice: NOTICE,
  };
}

/**
 * Simule l'avis qu'un PSP enverrait après le choix de scénario.
 * Retour : { outcome, notification, invalid } — la logique métier (activation,
 * idempotence, états) est traitée par paymentService, jamais ici.
 */
export function simulateOutcome(scenario, reference) {
  const base = { provider: "mock", mock: true, simulated: true, notice: NOTICE };
  switch (scenario) {
    case "success":
      return { outcome: "succeeded", invalid: false, notification: { ...base, reference, event: "payment.succeeded" } };
    case "declined":
      return { outcome: "failed", invalid: false, notification: { ...base, reference, event: "payment.declined" } };
    case "cancelled":
      return { outcome: "failed", invalid: false, notification: { ...base, reference, event: "payment.cancelled" } };
    case "pending":
      return { outcome: "pending", invalid: false, notification: { ...base, reference, event: "payment.pending" } };
    case "timeout":
      return { outcome: "pending", invalid: false, notification: { ...base, reference, event: "payment.timeout" } };
    case "provider_error":
      return { outcome: "pending", invalid: false, notification: { ...base, reference, event: "payment.provider_error" } };
    case "duplicate_notification":
      return { outcome: "succeeded", invalid: false, duplicate: true, notification: { ...base, reference, event: "payment.succeeded" } };
    case "invalid_notification":
      // Avis MALFORMÉ volontaire : jamais traité comme une confirmation.
      return { outcome: null, invalid: true, notification: { provider: "mock", event: "payment.???", reference: null, amount: -1, garbage: true } };
    default:
      return { outcome: null, invalid: true, notification: null };
  }
}
