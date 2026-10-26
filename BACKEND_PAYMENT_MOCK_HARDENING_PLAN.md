# PLAN DE CORRECTION — GARDE-FOU DES PAIEMENTS MOCK (ANALYSE & PLANIFICATION)

**Date :** 22/10/2026 · **Branche :** `refonte/nextjs` · **Aucun correctif implémenté — seul ce plan est produit.** · Référence : `BACKEND_PAYMENT_MOCK_GUARD_AUDIT.md`

---

## 1. Résumé exécutif

Le garde-fou est **déjà fail-closed multi-signaux**, mais deux de ses six rideaux dépendent de la **nom de la base/hôte** (`/supabase/i`, nom `postgres`) — devenus **inertes ou fragiles** après la bascule Supabase→Neon, et **contraires à la doctrine interne du code** (`index.js:54-55` : « le nom de la base n'est JAMAIS le signal de sécurité »). Ce plan rend l'autorisation du mock **indépendante du fournisseur PostgreSQL** en la faisant reposer sur : (1) un **signal d'environnement strict**, (2) une **autorisation explicite** (`PAYMENT_MOCK_ACK`, **variable proposée — n'existe pas**), (3) le maintien intégral du fail-closed. Les 7 invariants sont cadrés, la matrice de tests et 7 lots d'implémentation sont définis. **Rien n'est modifié ici.**

## 2. État actuel vérifié dans le code (relecture de cette phase)

| Fait | Preuve (relue) |
|---|---|
| Blocker `/supabase/i.test(DATABASE_URL)` | `Backend/services/paymentProviders/index.js:48` ✓ relu |
| Blocker `DATABASE_DRIVER !== "postgres"` | l.49 ✓ |
| Blocker nom de base = `postgres` / URL illisible | l.65-68 ✓ |
| Signal positif non-productif **obligatoire** | l.51-61 ✓ |
| `assertPaymentConfig()` fail-fast au démarrage | `server.js:38,43` ✓ |
| `isMockActive()` réévalué par requête | `paymentMockRoutes.js:35-40`, `server.js:140`, `subscriptionRoutes.js:108` ✓ |
| Fournisseur par défaut = `none` | `index.js:26-29` ✓ |
| Aucun fallback vers le mock | `index.js:30-37` (exceptions), `isMockActive()` = `false` sur erreur ✓ |
| Prix/référence/outcome serveur ; verrou `FOR UPDATE` ; états terminaux protégés | `paymentService.js:34,47,93,98-101` ✓ |
| GeniusPay non intégré (aucun client/signature/webhook) | `index.js:13,30-34` ✓ |
| `resolvePaymentMethod` = whitelist + `null` sinon | `db/repositories/subscriptions.js:200-217` ✓ (§5) |

*(Chemin réel : `Backend/services/paymentProviders/index.js` — le périmètre cite `Backend/paymentProviders/index.js`.)*

## 3. Invariants de sécurité (règles à garantir **tout fournisseur DB confondu**)

| # | Invariant | État actuel | Modification requise |
|---|---|---|---|
| **I1** | Un environnement de production **ne peut jamais** activer le mock | **Déjà garanti** (l.46-47 : `NODE_ENV`/`APP_ENV` ∈ {prod, production} = refus **inconditionnel**) | Non (à tester) |
| **I2** | `NODE_ENV`/`APP_ENV` absent, inconnu, contradictoire ou invalide **≠ autorisation** | **Déjà garanti** (l.56-61 : signal positif exigé ; toute valeur hors {dev, development, test, sandbox} = refus) | Non (à tester — cas « contradictoire » : prod sur l'un **et** dev sur l'autre → le blocker (a) l'emporte déjà, l.46-47) |
| **I3** | Le mock exige une **autorisation explicite**, distincte de la simple détection d'un env dev | **Partiellement** : `PAYMENT_MOCK_ENABLED=true` + `PAYMENT_MOCK_ENV` valide (l.70-71) — mais rien n'empêche la copie aveugle d'un `.env` de dev | **Oui** : `PAYMENT_MOCK_ACK` (§4) |
| **I4** | Le fournisseur DB **ne détermine pas** l'autorisation | **VIOLÉ aujourd'hui** : l.48 (`/supabase/i`) et l.65-66 (nom de base) y participent | **Oui** : retrait contrôlé (§4-C, Lot 4) |
| **I5** | Config ambiguë → **refus sûr** | **Déjà garanti** (tout blocker → `PaymentConfigError`, l.73-77 ; URL illisible = blocker, l.67-68) | Non |
| **I6** | Aucun fallback panne prestataire → paiement simulé | **Déjà garanti** (aucun fallback ; GeniusPay sélectionné = exception ; mock = choix explicite) | Non (à tester) |
| **I7** | Validation du paiement = **exclusivement serveur** | **Déjà garanti** (prix serveur l.34, outcome dérivé l.145-149, montant client ignoré, `rights` = statut serveur) | Non (à tester) |

## 4. Spécification proposée — `PAYMENT_MOCK_ACK` (**variable PROPOSÉE, inexistante aujourd'hui**)

**Rôle** : autorisation **explicite et dédiée** d'activer le mock, **distincte** de la simple présence d'un environnement de dev/test (I3) — « bouton de sécurité rouge » à activer volontairement.

| Aspect | Spécification proposée |
|---|---|
| **Valeurs acceptées** | **Liste blanche stricte à UNE valeur** : `MOCK-TEST-ONLY` (valeur **proposée**, à confirmer — ne correspond à aucune valeur existante du projet, vérifié : `PAYMENT_*` actuels = `PAYMENT_PROVIDER`, `PAYMENT_MOCK_ENABLED`, `PAYMENT_MOCK_ENV`) |
| **Absente** | **Refus** (blocker ajouté) — le mock ne s'active jamais par défaut |
| **Valeur incorrecte** | **Refus** (comparaison stricte d'égalité, jamais de `includes`/regex/sous-chaîne) |
| **Activée en production** | **Refus QUOI QU'IL ARRIVE** — voir règle impérative ci-dessous : `NODE_ENV`/`APP_ENV` ∈ {prod, production} = blocker **évalué AVANT et indépendamment** de `PAYMENT_MOCK_ACK` ; une ACK valide n'annule **jamais** un blocker |
| **Conflit avec `NODE_ENV`/`APP_ENV`** | **Hiérarchie fixe** : (1) blockers production → (2) signal positif non-productif → (3) ACK → (4) signaux mock. Aucune valeur d'ACK ne peut surcharger les niveaux (1) et (2) — **fail-closed par ordre d'évaluation**, pas par compensation |
| **Moment de validation** | **Démarrage** (`assertPaymentConfig()`, `server.js:43`) **ET par requête** (`isMockActive()`) — identique à aujourd'hui ; une modification d'env à chaud n'ouvre rien sans redémarrage + validation |

**Règle impérative respectée** : l'ordre d'évaluation garantit que `PAYMENT_MOCK_ACK` **n'est consultée qu'après** l'échec de tout blocker de production et la présence d'un signal non-productif explicite — **jamais capable d'autoriser le mock en production**, même valide.

### C — Retrait de la dépendance Supabase (préconditions du Lot 4)

| Blocker | Rôle aujourd'hui | Stratégie de retrait | Préconditions |
|---|---|---|---|
| l.48 `/supabase/i` | Refusait le mock sur la base Supabase (signal de prod) | **Remplacer par I3** (`PAYMENT_MOCK_ACK`) + conserver I1/I2 — la protection ne dépend plus de l'hôte | Tests I1/I2/I3 verts **avant** retrait ; bascule Neon planifiée |
| l.65-66 nom de base `postgres` | Heuristique prod | **Supprimer** (doctrine l.54-55 le condamne) | Idem |
| l.67-68 URL illisible | Fail-closed robuste | **CONSERVER** (utile tout fournisseur) | — |
| l.49 driver `postgres` | Cohérence technique | **CONSERVER** (non lié à un fournisseur) | — |

**Effet attendu** : Supabase, Neon, PostgreSQL local ou tout autre = **même niveau de sécurité** (I4) — aucune modification du comportement entre fournisseurs.

## 5. Analyse de `resolvePaymentMethod` (`db/repositories/subscriptions.js:200-217`)

| Point | Constat |
|---|---|
| **Définition** | `subscriptions.js:200` — mapping unique (« réutilisée par paymentService ») |
| **Appelants** | `subscriptions.js:168` (flux `subscribe()` — plans payants, payment `SUB-<id>`) ; `paymentService.js:40` (`initiatePaidSubscription`) |
| **Méthodes acceptées** | **whitelist** : `card`, `paypal`, `orange_money`, `moov_money`, `mtn_money`, `wave` (direct) + `mobile` + `details.provider` ∈ {`orange`, `mtn`, `wave`} → mappés vers l'enum |
| **Valeur par défaut** | **`null`** (aucune valeur implicite) |
| **Sélection client** | `paymentMethod`/`details.provider` viennent du client **mais sont mappés vers un enum serveur** : aucune valeur non prévue ne peut être stockée |
| **Contrôles côté serveur** | `paymentService.js:41-45` : `null` → erreur `INVALID_METHOD` (refus) ; `subscriptions.js:172` : `price > 0 && method` sinon pas de payment créé |
| **Interactions none/mock/GeniusPay** | **Indépendante** : ne consulte pas le fournisseur — `method` = métadonnée stockée ; le marqueur de simulation est porté par `raw_gateway_response` + la référence `MOCK-`, **jamais** par `method` |
| **Risque confusion simulation/réel** | **Modéré et documenté** : un paiement **mock** peut porter `method: "card"` ou `"paypal"` (GeniusPay absent) — acceptable en sandbox (aucun fond), **mais à exiger** qu'un futur GeniusPay réutilise ce mapping **sans jamais** accepter un `payment` créé par le flux mock comme preuve (règle I7 + trace `mock: true`) |
| **Observation connexe** | `subscribe()` crée des paiements `SUB-<id>` (pas `MOCK-`) pour les plans payants — parcours **distinct** du mock, à clarifier dans le lot d'audit (P3) : qui l'active ? quel statut ? |

**Incertain (documenté)** : le comportement exact du flux `subscribe()` avec `price > 0` (statut initial du payment, activation) — **à auditer dans le Lot 1** avant tout retrait de blockers.

## 6. Matrice de tests (unitaires + intégration — **non exécutés ici**)

Unitaires = `resolvePaymentProvider(env)` avec objet `env` injecté (aucun réseau) ; intégration = base dédiée uniquement.

| # | Scénario | Résultat attendu | Niveau | Fichier cible | Assertion |
|---|---|---|---|---|---|
| T1 | `NODE_ENV=production` + ACK absente | **Mock refusé** | U | `paymentProviders/index.js` | `PaymentConfigError`, message contient `NODE_ENV` |
| T2 | `NODE_ENV=production` + **ACK valide** | **Mock refusé** (règle impérative) | U | idem | `PaymentConfigError` — l'ACK ne compense jamais |
| T3 | `NODE_ENV=inconnu` (ex. `staging`) + ACK valide | **Refus sûr** | U | idem | `PaymentConfigError` (signal positif manquant) |
| T4 | `NODE_ENV=production` + `APP_ENV=development` (contradictoire) | **Refus sûr** | U | idem | blocker (a) l'emporte |
| T5 | `NODE_ENV=development` + ACK **absente** | **Mock refusé** | U | idem | blocker ACK |
| T6 | `NODE_ENV=development` + ACK=`MOCK-TEST-ONLY` + `PAYMENT_MOCK_ENABLED=true` + `PAYMENT_MOCK_ENV=dev` + driver postgres + URL valide | **Autorisation possible** (selon autres contrôles) | U | idem | `resolvePaymentProvider` → `{active:"mock"}` |
| T7 | `NODE_ENV=test` + même config que T6 | **Autorisation possible** | U | idem | idem |
| T8 | Même config que T6 avec **`DATABASE_URL` Neon** | **Aucune modification du niveau** (idem T6) | U | idem | strictement le même résultat que T6 |
| T9 | Même config que T6 avec **`DATABASE_URL` Supabase** | **Aucune modification du niveau** (idem T6, **après** Lot 4) | U | idem | strictement le même résultat que T6 |
| T10 | `DATABASE_URL` absente ou malformée | **Aucun contournement** | U | idem | `PaymentConfigError` (URL illisible) |
| T11 | Fournisseur réel indisponible (GeniusPay sélectionné) | **Aucun fallback mock** | U | idem | `PaymentConfigError` (geniuspay refusé) |
| T12 | Falsification montant côté client | **Paiement refusé ou montant serveur conservé** | I | `paymentService.js` | `pay.amount === plan.price` après confirmation ; montant client sans effet |
| T13 | Confirmation répétée (`duplicate_notification`) | **Aucune double activation** | I | idem | 1 seule subscription `active` ; `alreadyProcessed: true` au 2e |
| T14 | Méthode de paiement inconnue | **Refus sûr** | U | `subscriptions.js:200` | `resolvePaymentMethod("inconnu", {}) === null` ; appelant → `INVALID_METHOD` |
| T15 | (complément) ACK avec sous-chaîne (ex. `xMOCK-TEST-ONLYx`) | **Refus** | U | `paymentProviders/index.js` | égalité stricte |
| T16 | (complément) routes mock inactives | **404** | I | `paymentMockRoutes.js` | `POST /api/payments/mock/notifications` → 404 |

*(U = unitaire, injecté, sans base ; I = intégration, base de test dédiée, jamais la production.)*

## 7. Plan d'implémentation par lots (ordonné — **aucun lot exécuté**)

### Lot 1 — Audit final de `resolvePaymentMethod`
- **Fichiers** : `db/repositories/subscriptions.js`, `services/paymentService.js`, routes `subscriptionRoutes.js`.
- **Modifs** : aucune (audit) — clarifier le flux `subscribe()` `price > 0` (payment `SUB-<id>`).
- **Risques** : nul (lecture) · **Tests** : T14 · **Acceptation** : rapport complémentaire · **Arrêt** : si un paiement réel non tracé est découvert → alerte immédiate.

### Lot 2 — Politique d'environnement + `PAYMENT_MOCK_ACK`
- **Fichiers** : `services/paymentProviders/index.js` (blocker ACK), `Backend/.env.example` (documenter les variables mock), doc.
- **Modifs** : ajouter l'exigence `PAYMENT_MOCK_ACK === "MOCK-TEST-ONLY"` (§4) dans la chaîne existante, **après** blockers prod et signal positif.
- **Risques** : faible (refus plus strict = dev impacté, voulu) · **Tests** : T1-T7, T15 · **Acceptation** : matrice U verte · **Arrêt** : tout comportement « ACK valide + prod = actif » = rejet immédiat.

### Lot 3 — Renforcement du validateur
- **Fichiers** : `paymentProviders/index.js`, `server.js`.
- **Modifs** : log d'avertissement sur config mixte prod+mock (sans changer la décision) ; éventuellement refus si `NODE_ENV`/`APP_ENV` **absents** explicitement.
- **Risques** : faible · **Tests** : T3, T4 · **Acceptation** : aucun changement de décision, trace visible · **Arrêt** : si un log expose un secret.

### Lot 4 — Retrait contrôlé des blockers Supabase (I4)
- **Fichiers** : `paymentProviders/index.js` (l.48, l.65-66).
- **Modifs** : supprimer `/supabase/i` et le nom de base ; **conserver** l.49 (driver) et l.67-68 (URL illisible) ; ajouter un commentaire de doctrine.
- **Préconditions STRICTES** : Lots 1-3 terminés ; **T1-T7, T15 verts** ; bascule de `DATABASE_URL` vers Neon **planifiée** (pas forcément faite).
- **Risques** : **moyen** (retrait d'un rideau) — compensé par I3 · **Tests** : T8, T9, T10 + régression T1-T7 · **Acceptation** : T8 et T9 **identiques** à T6 (I4) · **Arrêt** : si T8/T9 divergent.

### Lot 5 — Tests unitaires de la politique
- **Fichiers** : nouveau `Backend/tests/paymentProvider.policy.test.js` (emplacement à confirmer — le projet n'a pas encore de suite de tests).
- **Modifs** : couverture T1-T7, T10-T11, T15 · **Risques** : nul · **Acceptation** : matrice verte en CI · **Arrêt** : si un test exige un service externe.

### Lot 6 — Tests de non-régression du parcours
- **Fichiers** : tests d'intégration (base dédiée).
- **Modifs** : T12, T13, T16 · **Risques** : écritures en base de test uniquement · **Acceptation** : verte · **Arrêt** : toute écriture en base non dédiée.

### Lot 7 — Audit final avant migration de base
- **Fichiers** : aucun (audit) — revue I1-I7 + `BACKEND_POSTGRES_TLS_AUDIT.md` + plan Neon (Phase 3).
- **Acceptation** : les 7 invariants tracés « garantis + testés » · **Arrêt** : invariant non couvert → ne pas migrer.

## 8. Risques et dépendances

| Risque | Gravité | Atténuation |
|---|---|---|
| Retrait de `/supabase/i` (Lot 4) = perte d'un rideau | Moyen | Préconditions strictes (Lots 1-3 + T1-T7/T15 verts) ; I3 compense |
| Impact dev : `PAYMENT_MOCK_ACK` casse les `.env` de dev existants | Faible (voulu) | Documenter dans `.env.example` ; erreur explicite listant les blockers |
| Ordre d'évaluation mal implémenté (ACK qui « compense » un blocker) | Élevé si erreur | Tests T2/T4 en **premier** ; revue de code ciblée sur l'ordre |
| Flux `subscribe()` `SUB-<id>` encore mal compris (Lot 1) | Moyen | Lot 1 obligatoire avant tout autre |
| Absence de suite de tests aujourd'hui (`scripts/phase5j/` nettoyé) | Moyen | Lot 5 = créer la structure ; sinon matrice non exécutable |

**Dépendances** : Lot 1 → 2 → 3 → 4 (séquentiel) ; 5 parallèle à 2-4 ; 6 après 4 ; 7 = final. Bascule Neon (Phase 3) = **indépendante** mais Lot 4 doit la précéder ou l'accompagner.

## 9. Critères d'acceptation globaux

1. Les **7 invariants** I1-I7 sont tracés « garantis par le code **et** couverts par au moins un test ».
2. **T2** (ACK valide + production = refus) et **T4** (contradictoire = refus) sont **verts avant toute autre chose**.
3. **T8 ≡ T9 ≡ T6** : le fournisseur DB n'a **aucun effet** sur l'autorisation (I4 vérifié empiriquement).
4. `git diff` du projet après Lots 1-7 = limité aux fichiers listés dans §7 + nouveaux tests ; **aucun `.env` réel modifié**.
5. Aucun secret dans les logs/tests ; aucune donnée de production touchée.
6. Lot 7 conclut explicitement « prêt » avant toute migration de base.

## 10. Éléments non vérifiables sans tests ou services externes

- Exécution réelle de la matrice (besoin d'une base dédiée pour l'intégration).
- Comportement concurrence (`FOR UPDATE`) sous charge.
- Comportement futur de GeniusPay (non implémenté — signature webhook à spécifier).
- `.env` de production réels (non lus) — la vérification de leur conformité se fera au déploiement.
- Réaction réelle du démarrage fail-fast (`server.js:43`) à une config invalide = à exécuter en environnement isolé.

---

**État Git** : `5 D / 40 M / 57 ?? / 7 D` (initial = final ; ce plan = seul fichier nouveau). **Aucun fichier source, test, configuration ou `.env*` modifié ; aucune base ni service contacté ; aucun paiement/webhook déclenché ; aucun secret exposé.**

**→ PLAN TERMINÉ. ARRÊT OBLIGATOIRE — aucun lot d'implémentation démarré ; attente d'une autorisation explicite.**

**Synthèse** : I1/I2/I5/I6/I7 = **déjà en place** (à couvrir par tests) ; **I3** = à renforcer ; **I4** = à corriger.