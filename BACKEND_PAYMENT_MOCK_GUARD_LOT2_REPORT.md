# LOT 2 — `PAYMENT_MOCK_ACK` : autorisation explicite du mock — RAPPORT

**Date :** 22/10/2026 · **Branche :** `refonte/nextjs` · **Références :** `BACKEND_PAYMENT_MOCK_HARDENING_PLAN.md` (§4/§7 Lot 2), `BACKEND_PAYMENT_MOCK_GUARD_LOT1B_REPORT.md`

*(Le fichier `BACKEND_PAYMENT_MOCK_GUARD_LOT2_REPORT.md` n'existait pas — vérifié ; créé sans écrasement.)*

---

## 1. État initial pertinent

- **Git** : `5 D / 40 M / 61 ?? / 7 D` · code réel relu avant modification (`Backend/services/paymentProviders/index.js`, **chemin réel** — le périmètre cite `Backend/paymentProviders/index.js`) : structure `(a) blockers absolus → (b) signal positif → (c) signaux mock → décision` **conforme au plan** ; `index.js` = **0 import** (module pur) · Lot 1B : 5/5 tests verts · `Backend/tests/` contient `lot1b-subscribe-guard.test.mjs`.
- **Invariant Lot 1B préservé** : `subscriptions.js` garde son refus des plans payants (non touché par ce lot).

## 2. Fichiers modifiés et raisons

| Fichier | Modification | Raison |
|---|---|---|
| `Backend/services/paymentProviders/index.js` | **(1)** Insertion **(b2)** : `if (env.PAYMENT_MOCK_ACK !== "MOCK-TEST-ONLY")` → blocker — **après** blockers (a) + signal positif (b), **avant** les signaux (c) · **(2)** doc de tête mise à jour (l.7-9 : `ET PAYMENT_MOCK_ACK=MOCK-TEST-ONLY`) | Autorisation explicite stricte (I3 du plan) |
| `Backend/tests/lot2-payment-mock-ack.test.mjs` | **Nouveau** — matrice 15 cas (unitaires purs, env injecté, sans DB) | Étape tests obligatoire |

**Non touchés (hors périmètre, conformément aux consignes)** : blockers Supabase (l.52) et nom de base (l.73-74) = **Lot 4** · `subscriptions.js`, `paymentService.js`, routes, `.env*`, `DATABASE_URL`, config, dépendances.

## 3. Logique d'autorisation — avant / après

**Avant** : mock actif si `PAYMENT_PROVIDER=mock` **ET** non-production **ET** signal non-productif **ET** (`PAYMENT_MOCK_ENABLED=true`, `PAYMENT_MOCK_ENV` valide, driver postgres, nom de base ≠ postgres, URL lisible).

**Après** : même chaîne **+ une exigence supplémentaire** placée au rang 3 de l'ordre de sécurité :

```
1. blockers (a)  : NODE_ENV/APP_ENV production → REFUS (jamais compensable)
2. signal (b)    : NODE_ENV ou APP_ENV ∈ {development, dev, test, sandbox} exigé
3. (b2) NOUVEAU  : PAYMENT_MOCK_ACK === "MOCK-TEST-ONLY"  (égalité STRICTE)
4. signaux (c)   : ENABLED, MOCK_ENV, driver, nom de base, URL lisible
5. décision      : tout blocker → PaymentConfigError (fail-closed)
```

- **Comparaison strictement égalitaire** (`!==`) : pas de `includes`, pas de `.trim()`, aucune normalisation → `MOCK-TEST-ONLY-extra`, `prefix-MOCK-TEST-ONLY`, `" MOCK-TEST-ONLY"`, `"MOCK-TEST-ONLY "` et `"\n"` = **refusés** (tests T2-08/09/10).

## 4. Tests exécutés — résultats exacts

| Commande | Résultat |
|---|---|
| `cd Backend && timeout 120 node --test tests/lot2-payment-mock-ack.test.mjs` | **15/15 VERTS** (142 ms) — `tests 15, pass 15, fail 0` |
| `cd Backend && timeout 120 node --test tests/lot1b-subscribe-guard.test.mjs` (non-régression) | **5/5 VERTS** (157 ms) — `pass 5, fail 0` |

Détail de la matrice (tous ✔) : **T2-01** prod+ACK valide → refus · **T2-02** prod+ACK absent → refus · **T2-03** test+ACK → autorisé · **T2-04** dev+ACK → autorisé · **T2-05** ACK absente → refus · **T2-06** ACK vide → refus · **T2-07** ACK incorrecte → refus · **T2-08** `MOCK-TEST-ONLY-extra` → refus · **T2-09** `prefix-MOCK-TEST-ONLY` → refus · **T2-10a/b/c** valeur + espaces/saut de ligne → refus · **T2-11** env inconnu → refus · **T2-12a/b/c** contradictoire/ambigu/absent → refus · **T2-13a-d** bloqueurs existants (ENABLED, MOCK_ENV, driver, nom de base) → refus · **T2-14** valide au démarrage puis invalide à l'exécution → **refus à l'exécution** · **T2-15** config invalide au démarrage → `PaymentConfigError` (`PAYMENT_CONFIG_INVALID`) ; `none` = neutre.

Vérifications finales (§8) : comparaison ACK **stricte** ✓ · production bloquée avec ACK valide ✓ (T2-01) · env inconnu = échec sécurisé ✓ (T2-11) · démarrage/exécution cohérents ✓ (T2-14/15, même `resolvePaymentProvider`) · bloqueurs existants actifs ✓ (T2-13) · gratuits + invariants Lot 1B préservés ✓ (5/5) · aucun `.env`/secret modifié ✓ · aucune base ni appel externe ✓.

## 5. Cas non exécutés et raisons

| Cas | Raison |
|---|---|
| **T18** (route `/subscribe` → 503 sans mock, intégration) | Nécessite une **base dédiée** — toujours reporté (déjà signalé Lot 1B) |
| Test de démarrage réel (`assertPaymentConfig` dans `server.js` avec process complet) | Demanderait une base réelle (fail-fast) — couvert unitairement par T2-15 |
| Concurrence `FOR UPDATE`, parcours mock bout-en-bout | Intégration, hors périmètre Lot 2 |

## 6. Production reste bloquée — confirmation

**Confirmé par code et par tests** : les blockers **(a)** sont évalués **avant** l'ACK et ne peuvent être compensés — `NODE_ENV` ou `APP_ENV` ∈ {`production`,`prod`} → `PaymentConfigError` **même avec** `PAYMENT_MOCK_ACK=MOCK-TEST-ONLY` (**T2-01/02 verts**). L'ordre d'évaluation (a → b → b2 → c) interdit toute « compensation » par l'ACK. Environnement inconnu/ambigu = **refus** (T2-11/12) — jamais interprété comme du test.

## 7. Aucune base, aucun `.env`, aucun fournisseur, aucun déploiement

**Confirmé** : aucun fichier `.env*` modifié (`git status` : rien de tel) · `DATABASE_URL`/`NEON_MIGR_URL` intactes · aucune connexion Supabase/Neon/base (tests purs, env injecté en mémoire, 0 socket) · aucune migration/seed/écriture · GeniusPay **non** implémenté ni appelé · aucun serveur démarré · aucun commit/déploiement · aucun secret dans les rapports · gratuite/mock/`resolvePaymentMethod`/Lot 1B = **intacts**.

## 8. État Git final et limites

| | Initial | Final |
|---|---|---|
| `git status --short` | `5 D / 40 M / 61 ?? / 7 D` | `5 D / 40 M / 62 ?? / 7 D` (+1 = ce rapport ; `Backend/tests/` = 1 entrée englobant les 2 fichiers de tests) |

**Limites** : tests unitaires uniquement (aucune intégration/serveur) · T18 non couvert · l'impact dev exigera de renseigner `PAYMENT_MOCK_ACK=MOCK-TEST-ONLY` dans les `.env` de dev (non faits ici — `.env` intouchés) · les blockers Supabase/nom de base restent en place (**Lot 4 non exécuté**).

**→ LOT 2 TERMINÉ. ARRÊT OBLIGATOIRE — Lot 3 non commencé, bloqueurs Supabase conservés, config de production intacte ; attente d'une autorisation explicite.**
- **Deux niveaux** : `assertPaymentConfig()` (démarrage, `server.js:43`) **et** `isMockActive()` (à chaque requête) appellent **la même** `resolvePaymentProvider()` → l'exigence ACK est **automatiquement** validée aux deux niveaux (test T2-14).
- **Aucun fallback** introduit ; `PAYMENT_PROVIDER=none` (défaut) reste neutre (`{mock:false}` — T2-15).