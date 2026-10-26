# LOT 4 — CI ET NETTOYAGE LEGACY — RAPPORT D'AUDIT (LECTURE SEULE)

**Date :** 26/10/2026 · Aucun fichier créé (hors rapports), déplacé ou supprimé · aucune variable modifiée · aucune dépendance.

---

## 1. Résumé exécutif
**Aucune CI n'existe** (0 workflow) — la matrice n'est validée qu'en local. Les 36 tests unitaires sont **automatisables immédiatement** (0 secret, 0 base). Legacy inventorié : `MONGO_URI`/`NEON_MIGR_URL` = **0 consommateur code** (supprimables/décidables) · `phase5j` (23) + `phase5h` = outils historiques à **archiver** · 72 rapports `.md` à la racine · 7 fichiers gardent des headers `Bearer` legacy. **Statut : PARTIEL** (propositions faites, rien appliqué).

## 2. Statut des vérifications

| Vérification | Statut | Résultat |
|---|---|---|
| Workflows CI | **VALIDÉ** | `/.github/workflows` = **0** (absent) |
| Commandes automatisables | **VALIDÉ** | `node --test tests/` (5 suites/36 tests) · `npm run lint` · `npm run build` — **0 secret, 0 base, 0 réseau** |
| Variables CI | **VALIDÉ** | **aucune** pour les tests unitaires (env injecté) · futurs tests intégration = base dédiée + secret `DATABASE_URL_TEST` |
| Risques secrets | **VALIDÉ** | nuls pour la matrice actuelle · ne jamais logger `DATABASE_URL`/`ADMIN_*` |
| CI sans prod | **VALIDÉ** | suites pures = partout ; intégration = runner + base de test isolée |

## 3. Proposition de workflow CI (**non créée**)
```yaml
# .github/workflows/ci.yml (PROPOSITION — non appliquée)
name: ci
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci && npm run lint && npm run build      # frontend
      - run: cd Backend && npm ci && node --test tests/   # 36 tests, sans base
  # integration: LOT SÉPARÉ — base dédiée (DATABASE_URL_TEST) requise
```

## 4. Inventaire legacy (consommateurs vérifiés)

| Élément | Consommateurs | Usage | Risque suppression | Recommandation |
|---|---|---|---|---|
| **`MONGO_URI`** | **0** | aucune | **Nul** | ✅ **SUPPRIMER** (futur lot) |
| **`NEON_MIGR_URL`** | **0** code | exploitation (branche test `cvc_n2_final`) | Faible | 📄 **DOCUMENTER** puis décider |
| **`NEON_PROD_URL`** | **1** (`scripts/neon/init-admin.mjs`) | création admin | Faible | ✅ **CONSERVER** |
| **`scripts/phase5j/*`** (23) | 0 | tests historiques (**cibles DB en dur**) | Moyen (exécution accidentelle) | 🗄️ **ARCHIVER** |
| **`scripts/phase5h/env-check.js`** | 0 | diagnostic env | Faible | 🗄️ **ARCHIVER** |
| **`scripts/migrate/data/*`** (10) | migration passée | **preuves d'audit** | Moyen | 📄 **CONSERVER** |

## 5. Partie C — Rapports Markdown (72 à la racine)
- **Inventaire** : 72 fichiers `.md` (migrations Neon, lots, plans, audits).
- **Références croisées** : nombreuses (les rapports de lots citent le plan et l'audit global).
- **Stratégie proposée (sans déplacement)** : créer `docs/rapports/README.md` = **index** (sommaire + liens), puis dans un lot autorisé : `git mv *.md docs/rapports/` + mise à jour des liens croisés + vérifier **0 consommateur code** (déjà vérifié : seuls les `.md` se citent).
- ⚠️ **Rien déplacé en cette mission.**

## 6. Commandes réellement exécutées
| Commande | Sortie | Résultat |
|---|---|---|
| `node /tmp/audit-lots.mjs` | 0 | `CI_WORKFLOWS=0` · `MONGO_URI(0)` · `NEON_MIGR_URL(0)` · `NEON_PROD_URL(1)` · `BEARER_FICHIERS=7` · `PHASE5J=23 MIGRATE_DATA=10 RAPPORTS_MD=72` |
| `grep` ciblés (grants, scripts) | 0 | usages documentés |

## 7. Preuves, hypothèses, non exécutés
- **Faits** : CI absente ; 0 consommateur pour `MONGO_URI`/`NEON_MIGR_URL` ; 72 rapports ; 23 scripts phase5j.
- **Hypothèse** : phase5j non utilisé par personne hors dépôt (rien ne le prouve).
- **Non exécutés** : création du workflow · déplacement des rapports · suppression de variables · exécution des scripts phase5j (cibles en dur = risque).

## 8. Risques identifiés
- **AN-03 (moyen)** : pas de CI → régressions détectées seulement en local.
- **AN-13 (faible)** : scripts phase5j exécutoires par erreur (anciennes cibles).
- **AN-09 (faible)** : 72 rapports à la racine (lisibilité).

## 9. Corrections recommandées (non appliquées)
1. Créer `.github/workflows/ci.yml` (§3) — **lot 5**.
2. **Lot 6** : supprimer `MONGO_URI`, décider `NEON_MIGR_URL`, archiver `phase5j/h`, nettoyer Bearer/localStorage.
3. **Lot 6** : archiver les rapports (`docs/rapports/`) avec index + liens croisés.

## 10. Critères de validation d'un futur lot
- CI : pipeline vert sur push (lint + build + 36 tests).
- Nettoyage : 36 tests + lint + build verts après modifications.
- Archivage : 0 lien cassé.

**STATUT DU LOT 4 : PARTIEL — inventaire complet, propositions faites, aucune modification appliquée.**
| **Headers `Bearer`** (7 fichiers) + `getItem('token')` (8) + `token`/`setToken` | actifs, inoffensifs (cookie prioritaire) | compat double canal | Faible (si retrait mal testé) | 🧹 **NETTOYAGE P3** (lot avec tests) |
| Commentaires supabase/`/Home`/`AdminSidebar` | — | traçabilité | Nul | 📄 **CONSERVER** |