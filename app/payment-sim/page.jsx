"use client";

/**
 * PARCOURS SANDBOX SIMULÉ (Lot 2G) — MODE TEST UNIQUEMENT.
 * Parcours utilisateur réaliste : plans → sélection → tentative de paiement →
 * page de simulation → résultat → statut d'abonnement → reprise après échec.
 * AUCUN PAIEMENT RÉEL, aucune donnée bancaire, aucun faux reçu GeniusPay.
 * Le résultat vient TOUJOURS du backend (jamais déduit du navigateur).
 */
import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { API_BASE_URL } from "../../src/api/client";

const NOTICE = "MODE TEST — AUCUN PAIEMENT RÉEL N'A ÉTÉ EFFECTUÉ";
const OUTCOMES = [
  { key: "success", label: "Simuler : paiement réussi" },
  { key: "declined", label: "Simuler : paiement refusé" },
  { key: "cancelled", label: "Simuler : paiement annulé" },
  { key: "pending", label: "Simuler : paiement en attente" },
];

function PaymentSimContent() {
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reference, setReference] = useState(searchParams.get("reference") || null);
  const [status, setStatus] = useState(null);
  const [state, setState] = useState("select"); // select | pending | success | declined | cancelled | error
  const [error, setError] = useState(null);

  const loadPlans = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/plans`);
      const body = await res.json();
      setPlans(Array.isArray(body.data) ? body.data : body);
    } catch {
      setError("Impossible de charger les plans");
    }
  }, []);

  const loadStatus = useCallback(async (ref) => {
    if (!ref) return;
    try {
      const res = await fetch(`${API_BASE_URL}/payments/mock/status/${encodeURIComponent(ref)}`, {
        credentials: "include",
      });
      if (!res.ok) {
        setState("error");
        setError(res.status === 404 ? "Tentative inconnue (mock indisponible ?)" : "Statut indisponible");
        return;
      }
      const body = await res.json();
      setStatus(body);
      const p = body.payment?.status;
      const s = body.subscription?.status;
      if (p === "succeeded" && s === "active") setState("success");
      else if (p === "failed") setState(s === "canceled" ? "cancelled" : "declined");
      else setState("pending");
    } catch {
      setState("error");
      setError("Erreur de communication");
    }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);
  useEffect(() => { if (reference) loadStatus(reference); }, [reference, loadStatus]);

  const initiate = async (plan) => {
    setError(null);
    setState("pending");
    try {
      const res = await fetch(`${API_BASE_URL}/subscriptions/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planId: plan._id, paymentMethod: "card" }),
      });
      const body = await res.json();
      if (res.status === 202 && body.reference) {
        setSelected(plan);
        setReference(body.reference);
      } else if (res.status === 503) {
        setState("error");
        setError("Paiement indisponible (prestataire non opérationnel) — le plan gratuit reste disponible.");
      } else {
        setState("error");
        setError(body.message || "Tentative refusée");
      }
    } catch {
      setState("error");
      setError("Erreur technique lors de la tentative");
    }
  };

  const advance = async (outcome) => {
    if (!reference) return;
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/payments/mock/sandbox/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reference, outcome }),
      });
      const body = await res.json();
      if (!res.ok) {
        setState("error");
        setError(body.message || "Simulation refusée");
        return;
      }
      await loadStatus(reference);
    } catch {
      setState("error");
      setError("Erreur technique");
    }
  };
  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
      <div style={{ background: "#7c2d12", color: "#fff", padding: "0.75rem 1rem", borderRadius: 8, fontWeight: 700, textAlign: "center" }}>
        ⚠️ {NOTICE}
      </div>
      <h1 style={{ marginTop: "1.5rem" }}>Simulateur de paiement (sandbox de test)</h1>
      <p style={{ color: "#444" }}>
        Parcours de test : la sélection du plan crée une <strong>tentative</strong> sans aucun droit ;
        l&apos;abonnement n&apos;est activé qu&apos;après confirmation côté serveur. Aucune donnée
        bancaire n&apos;est demandée. Retour aux <Link href="/plan">plans</Link>.
      </p>

      {state === "select" && (
        <section>
          <h2>1. Choisir un plan</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {plans.map((p) => (
              <li key={p._id} style={{ border: "1px solid #ddd", borderRadius: 8, margin: "0.5rem 0", padding: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{p.name} — {p.price} {p.price > 0 ? "XOF" : "(gratuit)"}</span>
                <button onClick={() => (p.price > 0 ? initiate(p) : window.location.assign("/plan"))} style={{ padding: "0.4rem 0.9rem", borderRadius: 6, border: "1px solid #333", cursor: "pointer" }}>
                  {p.price > 0 ? "Payer (simulation)" : "Souscrire (gratuit)"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {state === "pending" && reference && (
        <section style={{ border: "1px solid #d97706", borderRadius: 8, padding: "1rem" }}>
          <h2>2. Page de paiement simulée</h2>
          <p>Tentative : <code>{reference}</code> — plan {selected?.name} — montant serveur : {status?.payment?.amount ?? selected?.price} XOF</p>
          <p style={{ fontWeight: 700, color: "#7c2d12" }}>{NOTICE}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {OUTCOMES.map((o) => (
              <button key={o.key} onClick={() => advance(o.key)} style={{ padding: "0.5rem 0.9rem", borderRadius: 6, border: "1px solid #333", cursor: "pointer" }}>
                {o.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {state === "success" && (
        <section style={{ border: "1px solid #15803d", borderRadius: 8, padding: "1rem" }}>
          <h2>✅ Paiement simulé réussi</h2>
          <p>Abonnement : <strong>{status?.subscription?.status}</strong> — droits actifs : {status?.rights ? "oui" : "non"}</p>
          <p style={{ fontWeight: 700, color: "#7c2d12" }}>{NOTICE}</p>
          <button onClick={() => { setState("select"); setReference(null); setStatus(null); }} style={{ padding: "0.5rem 1rem", borderRadius: 6, cursor: "pointer" }}>Nouvelle simulation</button>
        </section>
      )}
      {(state === "declined" || state === "cancelled") && (
        <section style={{ border: "1px solid #b91c1c", borderRadius: 8, padding: "1rem" }}>
          <h2>❌ Paiement {state === "cancelled" ? "annulé" : "refusé"}</h2>
          <p>Aucun droit payant accordé. Abonnement : <strong>{status?.subscription?.status ?? "aucun"}</strong></p>
          <p style={{ fontWeight: 700, color: "#7c2d12" }}>{NOTICE}</p>
          <button onClick={() => { setState("select"); setReference(null); setStatus(null); }} style={{ padding: "0.5rem 1rem", borderRadius: 6, cursor: "pointer" }}>Réessayer</button>
        </section>
      )}
      {state === "error" && (
        <section style={{ border: "1px solid #b91c1c", borderRadius: 8, padding: "1rem" }}>
          <h2>⚠️ Erreur technique</h2>
          <p>{error}</p>
          <button onClick={() => { setState("select"); setReference(null); setError(null); }} style={{ padding: "0.5rem 1rem", borderRadius: 6, cursor: "pointer" }}>Recommencer</button>
        </section>
      )}
    </main>
  );
}

export default function PaymentSimPage() {
  return (
    <Suspense fallback={<p style={{ textAlign: "center", marginTop: "2rem" }}>Chargement…</p>}>
      <PaymentSimContent />
    </Suspense>
  );
}

