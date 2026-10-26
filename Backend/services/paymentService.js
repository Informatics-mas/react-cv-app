/**
 * Service de paiement (Lot 2G) — logique métier, distincte de la simulation.
 *
 * Principes :
 * - prix TOUJOURS lu côté serveur (plan issu de la base) ; le frontend n'est jamais cru ;
 * - une intention reste « pending » et ne donne AUCUN droit (entitlements = actif uniquement) ;
 * - confirmation idempotente : machine à états pending → succeeded|failed, jamais
 *   d'écrasement d'un état terminal, verrou SELECT ... FOR UPDATE (concurrence) ;
 * - l'activation réutilise les VRAIES règles de subscribe() (expire actifs,
 *   anti-contournement de quota Phase 5I, mise à jour du profil) ;
 * - aucun appel réseau prestataire depuis le mock ; toute référence est préfixée
 *   MOCK- et tracée en base comme simulée (jamais une preuve réutilisable).
 */
import crypto from "node:crypto";
import { withTransaction, pool } from "../db/pool.js";
import { resolvePaymentMethod } from "../db/repositories/subscriptions.js";
import { paymentsRepo } from "../db/repositories/payments.js";
import { transactionsRepo } from "../db/repositories/transactions.js";
import { isMockActive, assertPaymentConfig, PaymentConfigError, resolvePaymentProvider } from "./paymentProviders/index.js";
import { createMockIntent, simulateOutcome, MOCK_SCENARIOS, SANDBOX_OUTCOMES } from "./paymentProviders/mockProvider.js";

const TERMINAL = new Set(["succeeded", "failed"]);
const NOTICE = "MODE TEST — AUCUN PAIEMENT RÉEL N'A ÉTÉ EFFECTUÉ";

export { isMockActive, assertPaymentConfig, PaymentConfigError, resolvePaymentProvider, createMockIntent, simulateOutcome, MOCK_SCENARIOS, SANDBOX_OUTCOMES, pool };

/** Journal d'audit — aucun secret, aucune donnée sensible (réf/état/identifiants internes). */
function audit(event, data) {
  console.log(`[PAYMENT_MOCK] ${event} ${JSON.stringify(data)}`);
}

/** Création d'une tentative de paiement payante (statut pending, ZÉRO droit). */
export async function initiatePaidSubscription({ user, plan, paymentMethod, details }) {
  const price = Number(plan.price);
  if (!Number.isFinite(price) || price <= 0) {
    const e = new Error("Montant invalide");
    e.code = "INVALID_AMOUNT";
    throw e;
  }
  const method = resolvePaymentMethod(paymentMethod, details);
  if (!method) {
    const e = new Error("Méthode de paiement invalide");
    e.code = "INVALID_METHOD";
    throw e;
  }
  const mode = process.env.PAYMENT_MOCK_ENV || "dev";
  const reference = `MOCK-${crypto.randomUUID()}`;
  return withTransaction(async (client) => {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + Number(plan.duree || 0) * 86_400_000);
    const { rows: [sub] } = await client.query(
      `INSERT INTO subscriptions (user_id, plan_id, start_date, end_date, status, auto_renew)
       VALUES ($1,$2,$3,$4,'pending',false) RETURNING *`,
      [user._id, plan._id, startDate, endDate]
    );
    const payment = await paymentsRepo.createWithin(client, {
      user_id: user._id,
      subscription_id: sub._id ?? sub.id,
      amount: price,
      currency: "XOF",
      method,
      status: "pending",
      transaction_reference: reference,
      raw_gateway_response: {
        provider: "mock", mock: true, mode,
        createdAt: new Date().toISOString(),
        notice: NOTICE,
      },
    });
    audit("INTENT_CREATED", { reference, user: user._id, plan: plan.name, amount: price, mode });
    return {
      reference,
      subscriptionId: sub._id ?? sub.id,
      paymentId: payment._id ?? payment.id,
      amount: price,
      intent: createMockIntent({ reference, amount: price, currency: "XOF" }),
    };
  });
}
/**
 * Traitement d'un résultat de paiement (notification simulée / scénario).
 * Idempotent : une notification dupliquée ne réactive jamais deux fois ;
 * un état terminal n'est jamais écrasé ; verrou de ligne contre la concurrence.
 */
export async function processPaymentOutcome(reference, outcome, meta = {}) {
  if (!["succeeded", "failed", "pending"].includes(outcome)) {
    const e = new Error("Résultat de paiement inconnu");
    e.code = "INVALID_OUTCOME";
    throw e;
  }
  return withTransaction(async (client) => {
    const { rows: [pay] } = await client.query(
      `SELECT * FROM payments WHERE transaction_reference = $1 FOR UPDATE`,
      [reference]
    );
    if (!pay) return { ok: false, reason: "not_found" };

    if (TERMINAL.has(pay.status)) {
      audit("REPLAY_IGNORED", { reference, status: pay.status, asked: outcome });
      return { ok: true, alreadyProcessed: true, paymentStatus: pay.status };
    }

    if (outcome === "pending") {
      audit("STILL_PENDING", { reference, event: meta.event || null });
      return { ok: true, alreadyProcessed: false, paymentStatus: "pending", rights: false };
    }

    if (outcome === "failed") {
      await client.query(
        `UPDATE payments SET status='failed', raw_gateway_response = COALESCE(raw_gateway_response,'{}'::jsonb) || $2::jsonb WHERE id=$1`,
        [pay.id, JSON.stringify({ lastSimulated: { event: meta.event || null, at: new Date().toISOString() } })]
      );
      await client.query(
        `UPDATE subscriptions SET status='canceled' WHERE id=$1 AND status='pending'`,
        [pay.subscription_id]
      );
      audit("PAYMENT_FAILED", { reference, event: meta.event || null });
      return { ok: true, activated: false, paymentStatus: "failed", subscriptionStatus: "canceled" };
    }

    // outcome === 'succeeded' → activation avec les VRAIES règles métier.
    const { rows: [sub] } = await client.query(`SELECT * FROM subscriptions WHERE id=$1`, [pay.subscription_id]);
    const { rows: [plan] } = await client.query(`SELECT * FROM plans WHERE id=$1`, [sub.plan_id]);
    const { rows: [user] } = await client.query(`SELECT * FROM users WHERE id=$1 FOR UPDATE`, [pay.user_id]);
    if (!plan) {
      const e = new Error("Plan introuvable lors de la confirmation");
      e.code = "PLAN_MISSING";
      throw e;
    }

    // Anti-contournement de quota (règle identique à subscriptions.subscribe — Phase 5I).
    const samePlan = user.user_plan === plan.name;
    const { rows: [{ has_active }] } = await client.query(
      `SELECT EXISTS(SELECT 1 FROM subscriptions WHERE user_id=$1 AND status='active' AND end_date > now()) AS has_active`,
      [pay.user_id]
    );
    const resetDownloads = !samePlan || !has_active;

    await client.query(
      `UPDATE subscriptions SET status='expired' WHERE user_id=$1 AND status='active'`,
      [pay.user_id]
    );
    await client.query(`UPDATE subscriptions SET status='active' WHERE id=$1`, [pay.subscription_id]);
    await client.query(
      resetDownloads
        ? `UPDATE users SET user_plan=$1, user_max_downloads=$2, downloads_used=0 WHERE id=$3`
        : `UPDATE users SET user_plan=$1, user_max_downloads=$2 WHERE id=$3`,
      [plan.name, plan.max_downloads ?? 5, pay.user_id]
    );
    await client.query(
      `UPDATE payments SET status='succeeded', raw_gateway_response = COALESCE(raw_gateway_response,'{}'::jsonb) || $2::jsonb WHERE id=$1`,
      [pay.id, JSON.stringify({ confirmedSimulated: { event: meta.event || null, at: new Date().toISOString() }, notice: NOTICE })]
    );
    await transactionsRepo.createWithin(client, {
      payment_id: pay.id,
      type: "paiement",
      amount: pay.amount,
      description: `Règlement simulé de l'abonnement ${plan.name} — MODE TEST (aucun paiement réel)`,
    });
    audit("PAYMENT_CONFIRMED", { reference, user: pay.user_id, plan: plan.name });
    return { ok: true, activated: true, paymentStatus: "succeeded", subscriptionStatus: "active", planName: plan.name };
  });
}

/** Statut d'une tentative (parcours sandbox) — lecture seule. */
export async function getPaymentStatus(reference) {
  const { rows: [pay] } = await pool.query(
    `SELECT p.id, p.user_id, p.status, p.amount, p.currency, p.method, p.transaction_reference,
            s.id AS subscription_id, s.status AS subscription_status, s.end_date
       FROM payments p LEFT JOIN subscriptions s ON s.id = p.subscription_id
      WHERE p.transaction_reference = $1`,
    [reference]
  );
  if (!pay) return null;
  return {
    reference: pay.transaction_reference,
    mock: true,
    notice: NOTICE,
    payment: { status: pay.status, amount: pay.amount, currency: pay.currency, method: pay.method },
    subscription: { id: pay.subscription_id, status: pay.subscription_status, endDate: pay.end_date },
    rights: pay.subscription_status === "active",
  };
}

