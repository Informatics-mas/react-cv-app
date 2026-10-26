#!/usr/bin/env node
/**
 * Phase 5J-B — B4 : tests des plans payants/gratuits.
 * Scénarios P1-P14 : voir commentaire en fin de fichier.
 */
import { API, makePool, check, getFailures, createTestUser, purgeTestUsers, signToken } from "../phase5i/helpers.js";

const PORT = Number(process.argv[2] || 5000);
const BASE = API(PORT);
const pool = makePool();

const user = await createTestUser(pool, { suffix: "-pay" });
const admin = await createTestUser(pool, { role: "admin", suffix: "-pay" });
const userTok = signToken(user.id, "user");
const adminTok = signToken(admin.id, "admin");

const sub = (token, body) =>
  fetch(`${BASE}/subscriptions/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `token=${token}` },
    body: JSON.stringify(body)
  });

const state = async () => {
  const { rows: [{ n: subs }] } = await pool.query("SELECT count(*)::int AS n FROM subscriptions WHERE user_id = $1", [user.id]);
  const { rows: [{ n: pays }] } = await pool.query("SELECT count(*)::int AS n FROM payments WHERE user_id = $1", [user.id]);
  const { rows: [{ n: succ }] } = await pool.query("SELECT count(*)::int AS n FROM payments WHERE user_id = $1 AND status = 'succeeded'", [user.id]);
  const { rows: [u] } = await pool.query("SELECT downloads_used::int AS used, user_max_downloads::int AS max, user_plan FROM users WHERE id = $1", [user.id]);
  return { subs, pays, succ, used: u.used, max: u.max, plan: u.user_plan };
};

const { rows: [{ n: histBefore }] } = await pool.query("SELECT count(*)::int AS n FROM subscriptions");

try {
  // P1 — offres consultables (anonyme)
  let r = await fetch(`${BASE}/plans`);
  const plansBody = await r.json().catch(() => ({}));
  const plans = Array.isArray(plansBody) ? plansBody : (plansBody.data ?? []);
  const free = plans.find((p) => Number(p.price) === 0);
  const paid = plans.find((p) => Number(p.price) > 0);
  check("P1 GET /plans anonyme → 200 + offres présentes", r.status === 200 && !!free && !!paid,
    `gratuit=${!!free} payant=${!!paid} (price=${paid?.price})`);

  // P2 — parcours gratuit
  r = await sub(userTok, { planId: free._id, paymentMethod: "free" });
  let st = await state();
  check("P2 subscribe gratuit → 201 + plan actif", r.status === 201 && st.plan === "Free" && st.subs === 1,
    `status=${r.status}, plan=${st.plan}, subs=${st.subs}`);

  // P3 — plan payant SANS prestataire → 503 explicite
  r = await sub(userTok, { planId: paid._id, paymentMethod: "card", details: { name: "Test" } });
  const b3 = await r.json().catch(() => ({}));
  check("P3 subscribe payant → 503 PAYMENT_PROVIDER_UNAVAILABLE", r.status === 503 && b3.code === "PAYMENT_PROVIDER_UNAVAILABLE",
    `status=${r.status}, code=${b3.code || "∅"}`);

  // P4 — aucune écriture après P3
  st = await state();
  check("P4 aucune écriture après refus payant", st.subs === 1 && st.pays === 0 && st.succ === 0 && st.plan === "Free",
    `subs=${st.subs} payments=${st.pays} succeeded=${st.succ} plan=${st.plan} used=${st.used}`);

  // P5 — prix falsifié côté client
  r = await sub(userTok, { planId: paid._id, paymentMethod: "free", price: 0, amount: 0 });
  check("P5 prix falsifié → toujours 503 (prix serveur)", r.status === 503, `status=${r.status}`);

  // P6 — quota falsifié
  r = await sub(userTok, { planId: paid._id, maxDownloads: 9999, user_max_downloads: 9999 });
  st = await state();
  check("P6 quota falsifié ignoré", r.status === 503 && st.max === 5, `status=${r.status}, max=${st.max}`);

  // P7 — statut payé falsifié
  r = await sub(userTok, { planId: paid._id, status: "succeeded", paymentStatus: "succeeded" });
  st = await state();
  check("P7 statut payé falsifié → aucun paiement créé", r.status === 503 && st.pays === 0 && st.succ === 0,
    `status=${r.status}, payments=${st.pays}, succeeded=${st.succ}`);

  // P8 — planId bidon
  r = await sub(userTok, { planId: "00000000-0000-0000-0000-000000000000", paymentMethod: "free" });
  check("P8 planId inexistant → 404/400", r.status === 404 || r.status === 400, `status=${r.status}`);

  // P9 — anonyme
  r = await fetch(`${BASE}/subscriptions/subscribe`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId: paid._id, paymentMethod: "card" })
  });
  check("P9 subscribe anonyme → 401", r.status === 401, `status=${r.status}`);

  // P10 — admin : pas de passe-droit sur le paiement
  r = await sub(adminTok, { planId: paid._id, paymentMethod: "card" });
  check("P10 subscribe payant en admin → 503 (pas de contournement)", r.status === 503, `status=${r.status}`);

  // P11 — resouscription gratuite : quota NON réinitialisé (règle 5I conservée)
  await pool.query("UPDATE users SET downloads_used = 3 WHERE id = $1", [user.id]);
  r = await sub(userTok, { planId: free._id, paymentMethod: "free" });
  st = await state();
  check("P11 resouscription gratuite → quota non réinitialisé", r.status === 201 && st.used === 3,
    `status=${r.status}, used=${st.used} (attendu 3)`);

  // P12 — utilisateur inexistant → aucune écriture
  const ghostTok = signToken("00000000-0000-0000-0000-000000000000", "user");
  r = await sub(ghostTok, { planId: free._id, paymentMethod: "free" });
  const { rows: [{ n: histNow2 }] } = await pool.query("SELECT count(*)::int AS n FROM subscriptions");
  check("P12 user inexistant → 401/404, aucune écriture", (r.status === 401 || r.status === 404) && histNow2 === histBefore + 2,
    `status=${r.status}, subs_globales=${histNow2} (attendu ${histBefore + 2} : P2+P11)`);

  // P13 — contrat API : code + message pour le frontend
  check("P13 contrat frontend/backend (code+message)", typeof b3.message === "string" && b3.message.length > 10,
    `code=${b3.code}, message présent=${typeof b3.message === "string"}`);

  // P14 — abonnements historiques préservés
  const { rows: [{ n: histAfter }] } = await pool.query("SELECT count(*)::int AS n FROM subscriptions");
  check("P14 abonnements historiques préservés", histAfter >= histBefore,
    `globales ${histBefore}→${histAfter} (aucune suppression)`);

  st = await state();
  check("P-bis état final : plan gratuit, quota serveur intact", st.plan === "Free" && st.max === 5,
    `plan=${st.plan}, max=${st.max}, used=${st.used}`);
} finally {
  const n = await purgeTestUsers(pool);
  console.log(`Nettoyage : ${n} utilisateur(s) phase5i supprimé(s).`);
  await pool.end();
}

console.log(getFailures() === 0 ? "\nBILAN PLANS PAYANTS: TOUS PASS" : `\nBILAN PLANS PAYANTS: ${getFailures()} FAIL`);
process.exitCode = getFailures() > 0 ? 1 : 0;

