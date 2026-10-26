# LOTS 1, 3, 4 — RAPPORT DE SYNTHÈSE (AUDIT & VALIDATION)

**Date :** 26/10/2026 · **Audit/validation uniquement** — aucune modification de code, config, base, variable, fichier ou Git (hors les 4 rapports créés).

---

## 1. Vue d'ensemble

| Lot | Statut | Points clés | Bloqué sur |
|---|---|---|---|
| **1 — Réseau Neon** | **PARTIEL** | Pool/TLS conformes · erreurs `ETIMEDOUT`/`ENETUNREACH` = **intermittentes, externes** · test ponctuel **3/3 OK** (T1=6717ms TLS froid) · `ipv4first` = pertinent, **non appliqué** | Application de l'option (non autorisée) |
| **3 — Sécurité/RLS/Intégration** | **PARTIEL / BLOQUÉ** | `protect`/`adminOnly` + 401/403 distincts ✓ · RLS migrations = **26 policies/6 ENABLE** + rôles à moindres privilèges ✓ · T12/T13/T16/T18 = **inexistants** | **RLS applicative** (`SET ROLE cvc_app`, `set_option=false`) · **base dédiée** · compte non-admin |
| **4 — CI & Legacy** | **PARTIEL** | **0 workflow CI** · 36 tests automatisables sans secret · legacy inventorié (tableau) · 72 rapports | Création du workflow et nettoyage (non autorisés) |

## 2. Faits démontrés vs hypothèses

**Démontrés** : configuration du pool (TLS strict, `min: 0`) · absence de CI · absence de tests T12/13/16/18 exécutables · grants/politiques RLS présents dans les migrations · 0 consommateur pour `MONGO_URI`/`NEON_MIGR_URL` · épisodes réseau historiques (9 rapports) · test ponctuel 3/3 OK.
**Hypothèses** : cause exacte des `ETIMEDOUT` (Scale to Zero ? réseau WSL ?) · comportement des policies RLS sous `cvc_app` · scripts `phase5j` inutilisés.

## 3. Tests réellement exécutés (ce lot)

| Commande | Code | Résultat |
|---|---|---|
| `node /tmp/audit-lots.mjs` (collecte statique) | 0 | pool, DNS=0, RLS=26/6, rôles, T12-18 absents, CI=0, legacy |
| `node /tmp/net-check2.mjs` (3× `SELECT 1`, espace 3 s) | 0 | **T1=OK 6717ms \| T2=OK 594ms \| T3=OK 517ms** |
| `grep` grants / scripts / rapports | 0 | inventaires |
| Suites unitaires (effets vérifiés : env injecté, 0 écriture) | 0 | **36/36** (non rejouées ce lot — résultats historiques documentés) |

**Non exécutés** : tests de charge/prolongés (interdits) · T12/T13/T16/T18 (**BLOQUÉ**) · tests non-admin (**BLOQUÉ**) · `SET ROLE cvc_app` (**BLOQUÉ**) · création de workflow · déplacement de rapports · toute modification.

## 4. Risques principaux
1. **AN-01 (élevé)** : instabilité réseau transitoire → 503/refus (déjà bien gérés côté UI).
2. **AN-05 (élevé)** : RLS non prouvé en exécution.
3. **AN-03 (moyen)** : aucune CI.
4. **AN-04 (moyen)** : parcours paiement non couverts (T12/13/16/18).
5. **AN-13 (faible)** : scripts phase5j à risque d'exécution accidentelle.

## 5. Corrections recommandées (sans les appliquer)
| Priorité | Action | Lot |
|---|---|---|
| 1 | `--dns-result-order=ipv4first` sur les scripts backend | Lot 1 (application) |
| 2 | Base dédiée + tests RLS (`SET ROLE cvc_app`) + T12/13/16/18 | Lot 3 (tests) |
| 3 | Workflow CI (§3 du rapport Lot 4) | Lot 5 |
| 4 | Nettoyage : `MONGO_URI`, archivage `phase5j/h`, Bearer/localStorage, 72 rapports → `docs/rapports/` | Lot 6 |

## 6. État Git — comparaison initial/final

| | Initial | Final |
|---|---|---|
| `git status --short` | `5 D / 40 M / 84 ?? / 7 D` | `5 D / 40 M / 88 ?? / 7 D` (+4 = **les 4 rapports de cette mission**) |

**Confirmé** : **aucun fichier de travail préexistant altéré** (code, config, tests, `.env`, migrations intacts) · aucune suppression/déplacement · aucune écriture en base · aucun compte · aucun paiement · aucun commit · aucun secret affiché. **Anomalie détectée pendant la mission** : le terminal d'exécution a présenté plusieurs ratés de transmission de commandes (historique rejoué) — **résolus** en utilisant des scripts `/tmp` et l'écriture de résultats dans des fichiers ; aucun effet sur le dépôt.

---

**→ MISSION TERMINÉE — 4 rapports produits (`LOT1_…`, `LOT3_…`, `LOT4_…`, `LOTS_1_3_4_CONSOLIDATED_REPORT.md`). ARRÊT OBLIGATOIRE : aucune correction, aucun nettoyage, aucun commit, aucun déploiement. Attente de votre analyse et autorisation explicite.**