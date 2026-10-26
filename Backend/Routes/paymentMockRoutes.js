import express from "express";
import { z } from "zod";
import { protect, adminOnly } from "../Middleware/AuthMiddleware.js";
import {
  isMockActive,
  processPaymentOutcome,
  getPaymentStatus,
  simulateOutcome,
  MOCK_SCENARIOS,
  SANDBOX_OUTCOMES,
  pool,
} from "../services/paymentService.js";

/**
 * Routes du MOCK de paiement (Lot 2G) — TEST UNIQUEMENT.
 * Montées uniquement si le mock est légalement actif (double signal test,
 * jamais en production) + garde par route. Aucune signature cryptographique :
 * cette voie de notification est STRUCTURELLEMENT SÉPARÉE de tout futur
 * webhook GeniusPay (qui devra vérifier une vraie signature).
 */
const router = express.Router();

const NOTICE = "MODE TEST — AUCUN PAIEMENT RÉEL N'A ÉTÉ EFFECTUÉ";

// Vocabulaire sandbox → vocabulaire de statut du service (jamais de confusion).
const SANDBOX_TO_OUTCOME = {
  success: "succeeded",
  declined: "failed",
  cancelled: "failed",
  pending: "pending",
};

// Garde de défense en profondeur : si le mock n'est pas actif, ces routes
// n'existent pas (404) — y compris si le montage conditionnel était contourné.
router.use((req, res, next) => {
  if (!isMockActive()) {
    return res.status(404).json({ message: "Ressource indisponible" });
  }
  next();
});

const simulateSchema = z.object({
  reference: z.string().min(8).max(120),
  scenario: z.enum(MOCK_SCENARIOS),
});
const sandboxSchema = z.object({
  reference: z.string().min(8).max(120),
  outcome: z.enum(SANDBOX_OUTCOMES),
});
const notificationSchema = z.object({
  reference: z.string().min(8).max(120),
  event: z.string().min(3).max(60),
  amount: z.number().optional(),
});

async function findPaymentRow(reference) {
  const { rows: [pay] } = await pool.query(
    `SELECT id, user_id, status, transaction_reference FROM payments WHERE transaction_reference = $1`,
    [reference]
  );
  return pay || null;
}

/** POST /api/payments/mock/dev/simulate — MODE DÉVELOPPEUR (admin uniquement). */
router.post("/dev/simulate", protect, adminOnly, async (req, res) => {
  try {
    const v = simulateSchema.safeParse(req.body);
    if (!v.success) {
      return res.status(400).json({ code: "INVALID_REQUEST", message: "Requête invalide" });
    }
    const { reference, scenario } = v.data;
    const pay = await findPaymentRow(reference);
    if (!pay) return res.status(404).json({ code: "INTENT_NOT_FOUND", message: "Tentative inconnue" });

    const sim = simulateOutcome(scenario, reference);
    if (sim.invalid) {
      // Notification malformée/falsifiée : REJETÉE, jamais traitée comme une confirmation.
      return res.status(400).json({ code: "INVALID_NOTIFICATION", message: "Notification invalide — rejetée", mock: true });
    }
    const first = await processPaymentOutcome(reference, sim.outcome, { event: sim.notification.event });
    let second = null;
    if (sim.duplicate) {
      // Notification dupliquée : traitement idempotent (preuve : alreadyProcessed).
      second = await processPaymentOutcome(reference, sim.outcome, { event: sim.notification.event });
    }
    return res.status(200).json({
      success: true, mock: true, notice: NOTICE,
      scenario, outcome: sim.outcome,
      result: first, duplicateResult: second,
    });
  } catch (e) {
    if (["INVALID_OUTCOME", "INVALID_AMOUNT", "INVALID_METHOD", "PLAN_MISSING"].includes(e.code)) {
      return res.status(400).json({ code: e.code, message: e.message });
    }
    return res.status(500).json({ message: "Erreur lors de la simulation" });
  }
});
/** POST /api/payments/mock/sandbox/advance — parcours utilisateur de test (propre tentative uniquement). */
router.post("/sandbox/advance", protect, async (req, res) => {
  try {
    const v = sandboxSchema.safeParse(req.body);
    if (!v.success) {
      return res.status(400).json({ code: "INVALID_REQUEST", message: "Requête invalide" });
    }
    const { reference, outcome } = v.data;
    const pay = await findPaymentRow(reference);
    if (!pay) return res.status(404).json({ code: "INTENT_NOT_FOUND", message: "Tentative inconnue" });
    // Jamais de confirmation du paiement d'un AUTRE compte.
    const requester = req.user.id || req.user._id;
    if (pay.user_id !== requester) {
      return res.status(403).json({ code: "FORBIDDEN", message: "Accès refusé" });
    }
    const result = await processPaymentOutcome(reference, SANDBOX_TO_OUTCOME[outcome], { event: `sandbox.${outcome}` });
    return res.status(200).json({ success: true, mock: true, notice: NOTICE, outcome, result });
  } catch (e) {
    if (["INVALID_OUTCOME", "INVALID_AMOUNT", "INVALID_METHOD", "PLAN_MISSING"].includes(e.code)) {
      return res.status(400).json({ code: e.code, message: e.message });
    }
    return res.status(500).json({ message: "Erreur lors du traitement" });
  }
});

/**
 * POST /api/payments/mock/notifications — voie de notification de TEST.
 * Séparée structurellement de tout webhook réel ; pas de signature (documenté),
 * entrées malformées rejetées, doublons traités idempotemment.
 */
router.post("/notifications", protect, async (req, res) => {
  try {
    const v = notificationSchema.safeParse(req.body);
    if (!v.success) {
      return res.status(400).json({ code: "INVALID_NOTIFICATION", message: "Notification malformée" });
    }
    const { reference, event, amount } = v.data;
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
      return res.status(400).json({ code: "INVALID_NOTIFICATION", message: "Montant invalide" });
    }
    const pay = await findPaymentRow(reference);
    if (!pay) return res.status(404).json({ code: "INTENT_NOT_FOUND", message: "Tentative inconnue" });
    const requester = req.user.id || req.user._id;
    const isAdmin = req.user.role === "admin";
    if (!isAdmin && pay.user_id !== requester) {
      return res.status(403).json({ code: "FORBIDDEN", message: "Accès refusé" });
    }
    const outcome = event === "payment.succeeded" ? "succeeded"
      : ["payment.declined", "payment.cancelled"].includes(event) ? "failed"
      : event === "payment.pending" ? "pending"
      : null;
    if (!outcome) {
      return res.status(400).json({ code: "INVALID_NOTIFICATION", message: "Événement inconnu" });
    }
    const result = await processPaymentOutcome(reference, outcome, { event });
    return res.status(200).json({ success: true, mock: true, notice: NOTICE, result });
  } catch {
    return res.status(500).json({ message: "Erreur lors du traitement de la notification" });
  }
});

/** GET /api/payments/mock/status/:reference — statut de la tentative (propriétaire ou admin). */
router.get("/status/:reference", protect, async (req, res) => {
  try {
    const reference = String(req.params.reference || "");
    const status = await getPaymentStatus(reference);
    if (!status) return res.status(404).json({ code: "INTENT_NOT_FOUND", message: "Tentative inconnue" });
    const pay = await findPaymentRow(reference);
    const requester = req.user.id || req.user._id;
    if (req.user.role !== "admin" && pay.user_id !== requester) {
      return res.status(403).json({ code: "FORBIDDEN", message: "Accès refusé" });
    }
    return res.status(200).json({ success: true, ...status });
  } catch {
    return res.status(500).json({ message: "Erreur lors de la lecture du statut" });
  }
});

export default router;

