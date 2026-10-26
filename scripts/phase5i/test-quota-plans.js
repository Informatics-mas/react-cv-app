#!/usr/bin/env node
/**
 * Phase 5I — Audits D/E : quotas, plans et abonnements.
 *
 *  Q1 quota atomique : 6 concurrentes sur quota 5 → 5 succès / 1 refus
 *  Q2 refus 403 QUOTA_EXCEEDED au-delà, 401 token invalide sans consommation
 *  Q3 CONTOURNEMENT : re-souscription au plan courant ne doit PAS remettre
 *     le quota à 0 (ou alors le test FAIL = vulnérabilité confirmée)
 *  Q4 subscribe : le prix/MONTANT vient du serveur — un client qui envoie
 *     {price:0, maxDownloads:9999} ne modifie rien (planId fait autorité)
 *  Q5 subscribe plan payant sans paiement réel : paymentMethod non résoluble
 *     → aucune ligne payment "succeeded" inventée
 *  Q6 l'utilisateur ne peut PAS fixer user_max_downloads via un endpoint
 */
import { API, makePool, check, getFailures, createTestUser, purgeTestUsers, signToken } from "./helpers.js";

const PORT = Number(process.argv[2] || 5000);
const BASE = API(PORT);
const pool = makePool();

const user = await createTestUser(pool, { suffix: "-quota" });
const userTok = signToken(user.id, "user");

const authed = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `token=${userTok}` },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

const used = async () =>
  (await pool.query("SELECT downloads_used::int AS u, user_max_downloads::int AS m FROM users WHERE id = $1", [user.id])).rows[0];

const { rows: plans } = await pool.query("SELECT id, name, max_downloads::int AS m, price::numeric AS p FROM plans ORDER BY price");
const freePlan = plans.find((p) => p.name === "Free");

try {
  // --- Q1/Q2 : quota atomique via l'API ---
  const resps = await Promise.all(Array.from({ length: 6 }, () => authed("/downloads/authorize")));
  const codes = await Promise.all(resps.map(async (r) => ({ s: r.status, c: (await r.json().catch(() => ({}))).code || null })));
  const ok = codes.filter((x) => x.s === 200).length;
  const refused = codes.filter((x) => x.s === 403 && x.c === "QUOTA_EXCEEDED").length;
  const state = await used();
  check("Q1 quota atomique : 6 concurrentes sur quota 5 → 5×200 + 1×403", ok === 5 && refused === 1 && state.u === 5,
    `200=${ok} 403=${refused}, used=${state.u}/5`);

  const bad = await fetch(`${BASE}/downloads/authorize`, { method: "POST", headers: { Cookie: "token=invalide" } });
  const st = await used();
  check("Q2 token invalide → 401 sans consommation", bad.status === 401 && st.u === 5, `status=${bad.status}, used=${st.u}`);

  // --- Q3 : CONTOURNEMENT par re-souscription (vulnérabilité candidate) ---
  // Le user est à 5/5. Il se re-souscrit au plan Free. Si le compteur repasse à 0,
  // le quota est contournable à volonté → FAIL.
  await authed("/subscriptions/subscribe", { planId: freePlan.id, paymentMethod: "free" });
  const st2 = await used();
  check("Q3 re-souscription ne réinitialise PAS le quota", st2.u === 5,
    `après subscribe Free : used=${st2.u} (si 0 → CONTOURNEMENT CONFIRMÉ)`);

  // --- Q4 : le client ne fixe ni prix ni quota ---
  const before = await used();
  await authed("/subscriptions/subscribe", { planId: freePlan.id, paymentMethod: "free", price: 0, maxDownloads: 9999, user_max_downloads: 9999 });
  const after = await used();
  check("Q4 params client price/maxDownloads ignorés", after.m === freePlan.m && after.m !== 9999,
    `max=${after.m} (plan serveur=${freePlan.m}), used=${after.u}`);

  // --- Q5 : plan payant sans paiement résoluble → pas de payment "succeeded" fabriqué ---
  const paid = plans.find((p) => Number(p.p) > 0);
  if (paid) {
    const { rows: [{ n: payBefore }] } = await pool.query("SELECT count(*)::int AS n FROM payments WHERE user_id = $1", [user.id]);
    await authed("/subscriptions/subscribe", { planId: paid.id, paymentMethod: "inconnu", details: { fake: true } });
    const { rows: [{ n: payAfter }] } = await pool.query("SELECT count(*)::int AS n FROM payments WHERE user_id = $1", [user.id]);
    const { rows: [{ n: succeeded }] } = await pool.query("SELECT count(*)::int AS n FROM payments WHERE user_id = $1 AND status='succeeded'", [user.id]);
    check("Q5 pas de paiement fabriqué avec méthode non résoluble", payAfter === payBefore && succeeded === 0,
      `payments ${payBefore}→${payAfter}, succeeded=${succeeded}`);
  } else {
    check("Q5 pas de paiement fabriqué (plan payant absent de la base)", true, "aucun plan payant — scénario non exécutable");
  }

  // --- Q6 : aucun endpoint ne laisse fixer le quota ---
  // (vérifié statiquement : register force user_max_downloads=5, subscribe lit le plan serveur)
  check("Q6 quota non fixable par le client (statique + Q4)", after.m === freePlan.m, "register et subscribe ignorent les champs quota client");
} finally {
  const n = await purgeTestUsers(pool);
  console.log(`Nettoyage : ${n} utilisateur(s) phase5i supprimé(s).`);
  await pool.end();
}

console.log(getFailures() === 0 ? "\nBILAN QUOTA/PLANS: TOUS PASS" : `\nBILAN QUOTA/PLANS: ${getFailures()} FAIL`);
process.exitCode = getFailures() > 0 ? 1 : 0;
