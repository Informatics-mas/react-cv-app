# LOT 1B — SÉCURISATION DU CHEMIN `SUB-<id>` (risque R1) — RAPPORT

**Date :** 22/10/2026 · **Branche :** `refonte/nextjs` · **Référence :** `BACKEND_PAYMENT_MOCK_GUARD_LOT1_AUDIT.md` (R1/R2)

---

## 1. Vérifications effectuées (Étape 1)

| Vérification | Résultat |
|---|---|
| Code exact localisé | `Backend/db/repositories/subscriptions.js` — bloc payment `SUB-<id>` en l.165-187 (avant correction), signature `subscribe()` l.125 |
| Appelants directs/indirects | **1 seul appel réel** : `Backend/Routes/subscriptionRoutes.js:136` (dans le bloc **`price = 0` uniquement** — les plans payants retournent avant : mock → 202 intention, sinon → **503**) ; `services/paymentService.js:131` = commentaire |
| Références textuelles `SUB-` | 1 occurrence (génération l.171) — aucune autre |
| Tests existants | **aucun** (`Backend/tests/` absent, pas de script `test`) |
| Invariants de la route `/subscribe` | Préservés : `protect`, `subscribeSchema` (zod), 503 sans prestataire, mock → `pending` zéro droit |
| **Préconditions** | **Réunies** : le chemin `SUB-<id>` était **inatteignable par la route** (code mort) ; aucun flux existant ne dépend du bloc supprimé (le parcours gratuit passe par `price > 0 && method` = faux) |

## 2. Fichiers modifiés et justification

| Fichier | Modification | Justification |
|---|---|---|
| `Backend/db/repositories/subscriptions.js` | **(a)** Guard fail-closed **avant `withTransaction`** : `Number(plan.price) > 0` → erreur `code: "PAYMENT_PROVIDER_REQUIRED"` · **(b)** suppression du bloc payment `SUB-<id>` `succeeded` (imports dynamiques `paymentsRepo`/`transactionsRepo`, `method`, création payment/transaction) · **(c)** doc de `subscribe()` réécrite (invariant de sécurité + **convention `MOCK-`/`SUB-`**) | R1 : « ne jamais attribuer `succeeded` sans traitement serveur autorisé » |
| `Backend/tests/lot1b-subscribe-guard.test.mjs` | **Nouveau** — tests T14/T17/T19 (locales, sans base) | Étape 3 du lot |

**Préservé** : parcours gratuit (`price = 0`) **inchangé** · parcours mock (`initiatePaidSubscription` → `processPaymentOutcome`) **inchangé** · `resolvePaymentMethod` (export utilisé par `paymentService`) **conservé** · anti-contournement quota Phase 5I, expiration des actifs, `toApiSubscription` **intacts** · aucune config PostgreSQL/env/GeniusPay touchée.

## 3. Correction du risque R1

- **Avant** : `subscribe({plan payant})` créait un payment **`status: "succeeded"` sans prestataire**, référence `SUB-<id>`, `raw_gateway_response = details` **client** — inatteignable par la route actuelle, mais **exploitable par tout futur appelant**.

## 4. Convention `MOCK-` / `SUB-` (documentée dans le code et ici)

| Préfixe | Signification | Statut |
|---|---|---|
| **`MOCK-<UUID>`** | Tentative **SIMULÉE** (mode test) — `raw_gateway_response` porte `mock: true` + notice « MODE TEST — AUCUN PAIEMENT RÉEL » ; référence générée serveur (`paymentService.js:47`) | Actif — **jamais une preuve de paiement** |
| **`SUB-<id>`** | Ancien préfixe du parcours direct legacy (payment `succeeded` sans prestataire) | **SUPPRIMÉ** (ce lot) — **ne plus en créer** ; toute ligne `SUB-` présente en base = **historique**, à ne jamais confondre avec une confirmation prestataire |
| **Confirmations réelles** | Devront utiliser un préfixe dédié (ex. `GP-<ref>` GeniusPay) **et** passer par `processPaymentOutcome` | À définir au lot GeniusPay |

Règle unique : **toute ligne payment activée provient de `processPaymentOutcome`** (verrou + idempotence) — jamais d'une valeur de plan, d'une méthode ou de détails fournis par le client.

## 5. Tests exécutés et résultats

| Test | Portée | Résultat |
|---|---|---|
| `cd Backend && timeout 120 node --test tests/lot1b-subscribe-guard.test.mjs` | T17a (plan `9.99` numérique → refus `PAYMENT_PROVIDER_REQUIRED`), T17a-bis (prix chaîne `"9.99"` → refus), T17b (invariant source : 0 `status: "succeeded"`, 0 `SUB-${`, 0 `paymentsRepo`), T19 (convention documentée + `processPaymentOutcome` cité), T14 (whitelist `resolvePaymentMethod` : 9 assertions) | **5/5 VERTS** (150 ms) — **aucune connexion** (le guard rejette avant `withTransaction` ; env factice `DATABASE_URL` pour éviter le fail-fast d'import, jamais contactée) |
| **T18** (route `/subscribe` → 503 sans mock, 0 écriture) | Intégration | **NON EXÉCUTÉ** — nécessite une **base dédiée** (consigne : « si les tests exigent un service externe, arrêter et le signaler ») → reporté à la suite d'intégration |

Aucun serveur, aucune base, aucun prestataire contacté ; aucun paiement/webhook déclenché.

## 6. État Git initial et final

| | Initial | Final |
|---|---|---|
| `git status --short` | `5 D / 40 M / 59 ?? / 7 D` | `5 D / 40 M / 61 ?? / 7 D` (+2 : le test et ce rapport) |

**Modifications de ce lot** : `Backend/db/repositories/subscriptions.js` (déjà listé dans les 40 M) + 2 nouveaux fichiers (test + rapport). Modifications préexistantes **préservées** (diffs des lots antérieurs, 7 suppressions staged, fichiers non suivis) ; aucun `git reset/clean/stash/checkout` destructif ; aucun `.env*` modifié ; aucune base/prestataire contacté ; aucun commit/déploiement/redémarrage.

## 7. Limites et risques résiduels

| Point | Détail |
|---|---|
| **T18 non exécuté** | Le 503 de la route n'est pas couvert automatiquement — à intégrer avec une base dédiée |
| **R3 résiduel** | `details` client non schématisés (autres chemins) — hors périmètre de ce lot |
| **Lignes `SUB-` historiques** | Si des paiements `SUB-` existent en base (legacy), ils restent **`succeeded`** : non modifiés (aucune écriture en base) — à purger/annoter lors d'une migration dédiée si nécessaire |
| **Guard et `plan.price`** | Le guard utilise `Number(plan.price) > 0` — couvre numérique et chaîne ; un plan dont le prix serait `NaN` passe le guard mais la route l'aurait déjà filtré (`price > 0`) — double filet |
| Concurrence / FOR UPDATE | Inchangé, non testé ici (hors lot) |

**→ LOT 1B TERMINÉ. ARRÊT OBLIGATOIRE — Lot 2 non démarré sans autorisation explicite supplémentaire.**
- **Après** : **double barrière** — (1) le guard rejette tout plan `price > 0` **avant toute écriture/connexion** ; (2) le code capable de produire un `succeeded` hors `processPaymentOutcome` a été **supprimé** (invariant vérifié par T17b).
- Un paiement ne peut désormais être marqué `succeeded` **que** par `paymentService.processPaymentOutcome` (verrou `FOR UPDATE`, idempotence, états terminaux protégés).