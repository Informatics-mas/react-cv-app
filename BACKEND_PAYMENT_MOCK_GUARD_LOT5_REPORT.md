# LOT 5 — TESTS UNITAIRES DE LA POLITIQUE DE PAIEMENT — RAPPORT

**Date :** 22/10/2026 · **Branche :** `refonte/nextjs` · **Référence :** `BACKEND_PAYMENT_MOCK_GUARD_LOT5_AUDIT_REPORT.md` · Décisions d'autorisation : T11 = oui · CI = **non** (documentée) · T18 = **hors périmètre** (Lot 6)

*(Le fichier `BACKEND_PAYMENT_MOCK_GUARD_LOT5_REPORT.md` n'existait pas — vérifié ; créé sans écrasement.)*

---

## 1. État Git initial et final

| | Initial | Final |
|---|---|---|
| `git status --short` | `5 D / 40 M / 66 ?? / 7 D` | `5 D / 40 M / 67 ?? / 7 D` (+1 = ce rapport ; `Backend/tests/` = 1 entrée englobant les 5 fichiers de tests) |

Modifications préexistantes (Lots 1B→4, migration frontend, 7 suppressions staged, non suivis) **préservées** ; aucun commit/reset/clean/stash.

## 2. Fichiers modifiés et ajoutés

| Fichier | Action | Détail |
|---|---|---|
| `Backend/tests/paymentProvider.policy.test.mjs` | **Ajouté** (nom conforme au plan §7) | **T11-a→d** (GeniusPay/fallback) + **test de consolidation** (cartographie T1-T7/T10/T15) |
| Code fonctionnel | **AUCUN** | zéro modification de `index.js` ou autre source |
| Fichiers de tests existants | **AUCUN modification** | aucune assertion touchée (« ne pas modifier leurs assertions pour masquer un échec » — respecté : les 31 tests existants sont intacts) |

## 3. Tests ajoutés — comportement GeniusPay vérifié précisément

**Hypothèse documentée** (code réel `index.js:31-33`, relu) : `PAYMENT_PROVIDER=geniuspay` → `PaymentConfigError` (« GeniusPay n'est pas encore intégré — aucun client, aucune signature, aucun webhook »). **Comportement réel = conforme** (aucun écart → pas d'arrêt déclenché).

| Test | Assertion |
|---|---|
| **T11-a** | `geniuspay` → `PaymentConfigError` · `name` exact · `code = "PAYMENT_CONFIG_INVALID"` · **message vérifié mot à mot** : `/GeniusPay n'est pas encore intégré/` + `/aucun client, aucune signature, aucun webhook/` |
| **T11-b** | `geniuspay` **avec ACK valide + env test** → toujours exception · `isMockActive() === false` (aucun bypass par l'ACK) |
| **T11-c** | **Aucun fallback** : `geniuspay`, `stripe`, `paypal-xyz` → exceptions (jamais `{mock:true}`) ; `none` → `{active:null, mock:false, reason:"no-provider"}` (neutre, inchangé) |
| **T11-d** | Fournisseur inconnu → message « inconnu » (traçabilité) |
| **Consolidation** | Cartographie **sans duplication** : atteste que T1-T7, T10, T15 sont couverts par `lot2`/`lot3`/`lot4` (marqueurs T2-01/02/03/04/05/07/08/09/10/11, Lot3-2, T10) |

## 4. Tests exécutés et résultats (observés)

| Suite | Résultat |
|---|---|
| `lot1b-subscribe-guard.test.mjs` | **5/5** (`fail 0`) |
| `lot2-payment-mock-ack.test.mjs` | **15/15** (`fail 0`) |
| `lot3-payment-config-hardening.test.mjs` | **8/8** (`fail 0`) |
| `lot4-provider-independence.test.mjs` | **3/3** (`fail 0`) |
| `paymentProvider.policy.test.mjs` (nouveau) | **5/5** (`fail 0`) |
| **TOTAL** | **36/36 VERTS** (31 + 5) |

Commande : `cd Backend && node --test tests/<fichier>.test.mjs` (×5) — **sans serveur, sans base, sans socket, sans appel réseau**.

## 5. Garde-fous vérifiés préservés

| Garde-fou | Preuve (suite verte) |
|---|---|
| **Production bloquée, même avec ACK valide** | T2-01, T2-02 (lot2), Lot3-1/2 (lot3) |
| **ACK strict** (égalité exacte, absente/vide/suffixe/préfixe = refus) | T2-05→10c (lot2) |
| **Driver** (`DATABASE_DRIVER !== postgres` = refus) | T2-13c (lot2) |
| **URL invalides** (absente/illisible/vide = refus) | T10 (lot4) |
| **Aucun fallback non autorisé** | T11-b/c (nouveau) + `none` neutre |
| Indépendance fournisseur (Lot 4) | T8 ≡ T9 (lot4) |
| `warnMixedPaymentConfig`, démarrage + par requête | Lot3-6/7/8 (lot3) |

## 6. Limites restantes

- **CI** : **non créée** (décision explicite) — la validation « matrice verte en CI » reste **à mettre en place** ; actuellement la matrice est validée **en local** (`node --test`, 36/36).
- **T18** (route `/subscribe` → 503) : **non exécuté** — **réservé au Lot 6** (base dédiée requise) ; de même que T12/T13/T16.
- Test de couverture « consolidation » = vérification de présence des marqueurs (pas une exécution des cas eux-mêmes, déjà exécutés par leurs suites).
- Aucun test navigateur ni d'intégration (inchangé).

## 7. Confirmation d'interdictions

Aucun `.env`/secret/URL modifié ou affiché · aucune base, aucune migration, aucun réseau · **aucun workflow CI créé ni modifié** · **T18 non exécuté** · serveur non démarré · aucun déploiement/commit · aucun test existant neutralisé · **aucune modification fonctionnelle** (critère d'arrêt « modification fonctionnelle nécessaire » non déclenché) · périmètre non élargi.

---

## ✅ LOT 5 TERMINÉ

**Justification** : T11 ajouté avec assertions précises sur l'exception GeniusPay (comportement réel = conforme à l'hypothèse) · consolidation **sans duplication ni modification d'assertions** · **36/36 tests verts** · garde-fous préservés · décisions d'autorisation respectées (CI documentée, T18 hors périmètre) · aucun critère d'arrêt déclenché.

**→ ARRÊT — Lot 6 (T12/T13/T16/T18, intégration) non commencé ; attente d'une autorisation explicite.**