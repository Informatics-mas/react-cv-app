# AUDIT PRÉPARATOIRE DU LOT 4 — GARDE-FOU PAIEMENTS MOCK (LECTURE SEULE)

**Date :** 22/10/2026 · **Branche :** `refonte/nextjs` · **Aucune modification de code, de tests, de `.env` ou de configuration — aucun retrait de bloqueur.**

---

## 1. Résumé exécutif

Les deux bloqueurs ciblés par le Lot 4 sont **localisés et analysés** : `/supabase/i` (`index.js:49`, blocker absolu) et l'heuristique nom de base `postgres` (`index.js:78-80`, blocker (c), **distinct** du contrôle de lisibilité de l'URL `l.81` — les deux conservés par le Lot 4). **L'analyse par le code démontre** que leur retrait ne relâche **aucun** des refus attendus (production, env inconnu/contradictoire, ACK absente/invalide, mock incomplète, fournisseur réel non géré) — ces refus reposent sur les blockers (a)/(b)/(b2)/(c) **indépendants du fournisseur**. En revanche, **T8/T9/T10 ne sont pas encore écrits** (0 test utilisant des URLs Neon/Supabase, 0 test sur l'URL illisible) : ils doivent accompagner le Lot 4. Suites exécutées : **28/28 VERTS** (5/5, 15/15, 8/8). Migration Neon : **planifiée (documents) mais non datée/non autorisée**. → Conclusion §10.

## 2. État Git initial

`git status --short` : **`5 D / 40 M / 63 ?? / 7 D`** — modifications préexistantes (Lots 1B/2/3, migration frontend, 7 suppressions staged) **préservées**. Les 5 rapports demandés sont **présents** (AUDIT, HARDENING_PLAN, LOT1B, LOT2, LOT3) — aucun écart de nom. Rapport Lot 4 : n'existait pas (créé ici).

## 3. État réel des deux bloqueurs (code vérifié)

### A. Bloqueur Supabase

| Point | Constat |
|---|---|
| **1. Emplacement** | `Backend/services/paymentProviders/index.js:49` (chemin réel confirmé) — dans le bloc **(a) Interdictions ABSOLUES** |
| **2. Condition** | `if (/supabase/i.test(env.DATABASE_URL || "")) blockers.push("DATABASE_URL cible une base Supabase/production")` — regex insensible à la casse sur la chaîne **entière** de `DATABASE_URL` (vide = non matchant) |
| **3. Effet réel** | Tout `DATABASE_URL` contenant « supabase » (hôte, chemin, mot de passe, n'importe où) → blocker → `PaymentConfigError` **si** `PAYMENT_PROVIDER=mock` est sélectionné (sinon la fonction renvoie `no-provider` sans examiner les blockers) |
| **4. Tests couvrants** | **Aucun dédié** (0 test ne fournit d'URL Supabase) — couvert indirectement par T2-13x (autres blockers) ; **lacune T9** |
| **5. Conséquences du retrait (sans le retirer)** | Voir analyse ci-dessous — **aucun refus attendu ne dépend de lui** |

**Le garde-fou continuerait-il à refuser après retrait ? (analyse par le code, blockers restants) :**

| Cas | Après retrait | Garant |
|---|---|---|
| Production + ACK valide | **Refus** | blocker (a) l.47-48 (`NODE_ENV`/`APP_ENV` ∈ prod) — **avant** tout |
| Env inconnu / contradictoire | **Refus** | blocker (b) (signal positif exigé) + (a) si prod sur l'un |
| ACK absente ou invalide | **Refus** | blocker (b2) (égalité stricte) |
| Config mock incomplète | **Refus** | blockers (c) : `PAYMENT_MOCK_ENABLED`, `PAYMENT_MOCK_ENV` |
| Fournisseur réel non pris en charge | **Refus/exception** | `geniuspay` → `PaymentConfigError` (l.33-37) ; inconnu → exception |
| URL illisible | **Refus** | blocker catch l.81 (**conservé**) |

**Seul effet du retrait** : une config `dev/test` + ACK + mock complète avec `DATABASE_URL` **contenant « supabase »** deviendrait activable (aujourd'hui refusée) — c'est précisément **I4** (indépendance fournisseur). **Risque associé** : perte d'un rideau défensif si une prod était déployée en `NODE_ENV=development` (triple erreur) — compensé par (a)/(b)/(b2) + l'avertissement Lot 3.

### B. Heuristique nom de base `postgres`

| Point | Constat |
|---|---|
| **1. Extraction** | `index.js:78` : `const db = new URL(env.DATABASE_URL \|\| "").pathname.slice(1)` — segment de chemin de l'URL |
| **2. Cas bloqués** | `db === "postgres"` → blocker « nom de base 'postgres' associé à la production » (l.79-80) |
| **3. URL malformée** | `new URL(...)` lève → **catch l.81** : blocker **séparé** « DATABASE_URL illisible » → **refus** |

## 4. Matrice I1–I7 (code · tests · lacunes)

| Inv. | Garant (code) | Tests réellement présents | Exécutés | Lacunes |
|---|---|---|---|---|
| **I1** prod → jamais de mock | blockers (a) l.47-48, évalués **en premier** | T2-01, T2-02, Lot3-1, Lot3-2 | **28/28 verts** (observés) | — |
| **I2** env absent/inconnu/contradictoire → refus | blocker (b) l.59-67 (signal positif exigé) | T2-11, T2-12a/b/c, Lot3-2/3/4 | ✓ observés | — |
| **I3** ACK strictement validée | blocker (b2) l.70-75 (égalité stricte `!==`) | T2-05→10c (absente/vide/incorrecte/suffixe/préfixe/espaces) | ✓ observés | — |
| **I4** indépendance fournisseur | **VIOLÉ aujourd'hui** : l.49 `/supabase/i` + l.78-80 nom de base participent à la décision | **aucun** (T8/T9 non écrits) | — | **T8/T9 à écrire** (objet du Lot 4) |
| **I5** ambiguë → refus | blockers + catch « illisible » l.81 | T2-13a-d, T2-15, Lot3-8 | ✓ observés | **URL malformée sans test** (T10) |
| **I6** aucun fallback vers le mock | `geniuspay` = exception l.33-37 ; `none` = neutre ; `isMockActive` = `false` sur erreur | T2-15 (partiel : `none` neutre) | ✓ | pas de test « prestataire réel en échec → pas de mock » (inspection seule : aucun code de fallback existe) |
| **I7** validation serveur du paiement | `paymentService` (prix serveur, `processPaymentOutcome`, FOR UPDATE) + Lot 1B (guard `subscribe`) | T14, T17a/b (Lot 1B) | ✓ 5/5 | T12/T13 (intégration, base dédiée) |

**Distinction** : I1/I2/I3/I5 = **garanties par code ET vérifiées par tests exécutés** · I4 = **non garantie** (volontairement — c'est l'objet du Lot 4) · I6 = **garantie par inspection** (pas de code de fallback) + test partiel · I7 = garantie par code + tests unitaires partiels.

## 5. Couverture et résultats T1–T7 / T15 (préconditions du Lot 4)

| Précond. | Scénario | Test existant | Résultat observé |
|---|---|---|---|
| T1 | prod + ACK absente → refus | T2-02 | ✔ refus |
| T2 | prod + ACK valide → refus | T2-01 | ✔ refus |
| T3 | env inconnu + ACK valide → refus | T2-11 | ✔ refus |
| T4 | `NODE_ENV=production` + `APP_ENV=development` → refus | T2-12a / Lot3-2 | ✔ refus |
| T5 | dev + ACK absente → refus | T2-05 | ✔ refus |
| T6 | dev valide + ACK → autorisation possible | T2-04 / Lot3-5 | ✔ `mock: true` |
| T7 | test valide + ACK → autorisation possible | T2-03 | ✔ `mock: true` |
| T15 | ACK sous-chaîne → refus | T2-08, T2-09, T2-10a/b/c | ✔ refus |

**Suites exécutées cette phase** (sans réseau ni base, sans serveur) : `lot1b-subscribe-guard` **5/5**, `lot2-payment-mock-ack` **15/15**, `lot3-payment-config-hardening` **8/8** = **28/28 VERTS**. Aucune suite non exécutée (toutes pures) ; T18/intégration = hors périmètre (base requise).

## 6. Faisabilité de T8 / T9 / T10 sans base (unitaires, env injecté)

`resolvePaymentProvider(env)` accepte un objet `env` → **tests purs, 0 connexion** :

1. **URL synthétiques** (jamais de vraies valeurs) :
   - T8 (Neon) : `postgres://user:pass@ep-example-pooler.aws.neon.tech:5432/appdb`
   - T9 (Supabase) : `postgres://user:pass@aws-0-eu-west-1.pooler.supabase.com:5432/appdb`
   - T10 (malformée) : `not-a-url` ; (absente) : `undefined`
2. **Variables identiques entre T6/T8/T9** : tout `baseEnv()` (Lot 2/3) à l'exception de la seule `DATABASE_URL` — ainsi **T8 ≡ T6** et **T9 ≡ T6** après Lot 4.
3. **Attendu avant/après** : **T8 ≡ T6 déjà aujourd'hui** (le blocker `/supabase/i` ne matche pas Neon) ; **T9 = refus aujourd'hui** (blocker l.49) et **T9 ≡ T6 après** Lot 4 — cette différence est exactement la preuve d'I4 (à observer, pas à supposer) · **T10 = refus** avant **et** après (catch l.81 conservé).
4. **Faux positifs possibles** : URL Neone contenant « supabase » dans le mot de passe (regex sur la chaîne entière) — à documenter dans le test ; confusion si le `baseEnv` inclut un nom de base `postgres` (à garder `appdb`).
5. **Vérifier que la lisibilité reste active** : T10 doit être rejoué **après** le retrait et rester en échec (= refus) ; le catch l.81 ne doit pas être modifié.

**Non affirmé ici** : l'équivalence T8/T9 — elle sera **observée** lors de l'exécution du Lot 4 (tests d'accompagnement).

## 7. État de préparation de la migration Neon (documents non sensibles uniquement)

| Source | Constat |
|---|---|
| `SUPABASE_TO_NEON_MIGRATION_AUDIT.md` (Phase 3) | Migration **planifiée** : plan ordonné en 7 étapes (provision → données → garde-fou → bascule `DATABASE_URL` → validation → nettoyage) ; **risque majeur identifié** = le garde-fou `paymentProviders` (objet du Lot 4) |
| `MIGRATION_NEON*.md` (21 rapports) + `scripts/migrate/data/` complet | Pipeline de migration **exécuté en environnement de test** (`cvc_n2_final`, branche `migration-test`) — preuves locales |
| `BACKEND_POSTGRES_TLS_AUDIT.md` | Pair actuel = **pooler Supabase** (`aws-0-eu-west-1.pooler.supabase.com`) — divergence code/« Neon » documentée |
| **Calendrier** | **Non vérifiable dans le périmètre de cet audit** (aucune date, aucune autorisation dans les documents) |

**« Une migration planifiée ne signifie pas qu'elle est autorisée à être exécutée »** — non exécutée ici (aucun `.env` ouvert, aucune connexion, aucune URL lue).

## 8. Risques liés à un retrait prématuré

| Risque | Gravité | Détail |
|---|---|---|
| Perte d'un rideau défensif (prod déployée en `NODE_ENV=development` + config mock complète + URL Supabase) | Moyen | Seul scénario où le blocker Supabase ajoute quelque chose aujourd'hui — compensé par (a)/(b)/(b2) + avertissement Lot 3, mais la profondeur de défense diminue |
| Retrait **avant** les tests T8/T9/T10 | Moyen | Aucune preuve automatisée de l'équivalence des décisions (I4) ne serait disponible |
| Retrait **sans** bascule Neon coordonnée | Faible-moyen | Rien ne change fonctionnellement, mais la doctrine devient « indépendante » alors que la base reste Supabase — acceptable, à documenter |
| Heuristique nom de base retirée alors que des URLs de prod s'appellent `postgres` | Faible | Ce blocker est déjà contraire à la doctrine interne (l.54-55 du code d'origine) — son retrait est cohérent |

## 9. Préconditions restant à satisfaire (avant implémentation du Lot 4)

1. **Écrire T8/T9/T10** (unitaires, env injecté, §6) et les exécuter **avant** le retrait : observer T8 ≡ T6 ; **T9 = refus** (état actuel) ; **T10 = refus**.
2. **Implémenter le Lot 4** (retrait de l.49 + l.78-80 uniquement — l.50 driver et l.81 illisible **conservés**).
3. **Rejouer les 4 suites** (Lot 1B, 2, 3 + nouveau) : observer **T9 ≡ T6 ≡ T8** et **T10 toujours en refus** (I4 prouvé empiriquement + lisibilité conservée).
4. **Coordination migration Neon** : le retrait peut précéder ou accompagner la bascule ; à tracer dans le plan Phase 3.
5. Optionnel recommandé : T18 (intégration) quand une base dédiée sera disponible.

## 10. Conclusion

## ✅ LOT 4 PRÊT POUR EXAMEN D'AUTORISATION

**Justification** : (i) les deux bloqueurs sont localisés et leur retrait **ne relâche aucun refus** attendu (analyse de code §3 — production, env inconnu/contradictoire, ACK, mock incomplète, fournisseur réel, URL illisible = tous garantis par des blockers **conservés**) ; (ii) préconditions T1-T7/T15 = **vertes** (28/28 exécutés cette phase) ; (iii) I1/I2/I3/I5/I7 = garantis et testés ; (iv) la migration Neon est planifiée (documents). **Sous conditions express** : les tests T8/T9/T10 doivent accompagner le Lot 4 (écriture + exécution avant/après — §9) ; cette conclusion **ne vaut pas autorisation d'implémenter**.

## 11. État Git final et limites respectées

| | Initial | Final |
|---|---|---|
| `git status --short` | `5 D / 40 M / 63 ?? / 7 D` | `5 D / 40 M / 64 ?? / 7 D` (+1 = ce rapport) |

**Confirmé** : aucune modification de code/test/config · aucun bloqueur retiré ni contourné · aucun `.env`/secret lu ou modifié (aucune URL réelle affichée) · aucune base, aucun réseau, aucun fournisseur · aucun paiement/webhook/migration/seed · aucun serveur démarré · aucun commit/déploiement · tests exécutés = suites pures uniquement · tests non exécutés signalés (T18, intégration).

**→ AUDIT LOT 4 TERMINÉ. ARRÊT — aucune recommandation appliquée ; attente d'une autorisation explicite d'implémentation du Lot 4.**
| **4. Distinct du contrôle de lisibilité ?** | **Oui** — même `try` mais deux blockers indépendants : le retrait du nom de base (Lot 4) **conserve** le catch « illisible » (consigne respectée) |
| **5. Tests** | Nom de base = **T2-13d** (`postgres://…/postgres` → refus) ✓ exécuté · URL illisible = **AUCUN test** (lacune T10) |