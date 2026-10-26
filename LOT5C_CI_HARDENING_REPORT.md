# LOT 5C — DURCISSEMENT MINIMAL DU WORKFLOW CI — RAPPORT

**Date :** 26/10/2026 · **Périmètre** : uniquement `.github/workflows/ci.yml` · aucun commit/push/déploiement · aucun fichier applicatif/lockfile/script/test/`.env` touché.

---

## 1. État Git

| | Initial | Final |
|---|---|---|
| `git status --short` | `5 D / 40 M / 91 ?? / 7 D` | `5 D / 40 M / 92 ?? / 7 D` (+1 = ce rapport) |

**Confirmé** : seuls `ci.yml` (modifié) et ce rapport (nouveau) ont changé · tous les changements préexistants préservés.

## 2. Modifications exactes du workflow (3 ajouts)

**CI-01 — Permissions minimales** (niveau workflow) :
```yaml
permissions:
  contents: read
```

**CI-02 — Timeout du job** (`jobs.quality`) :
```yaml
timeout-minutes: 15
```
Justification : mesures locales (lint < 10 s · tests < 2 s · build < 60 s) ; installation npm comprise, 15 min = plafond très confortable sans risque de coupure.

**CI-03 — Concurrence contrôlée** (niveau workflow) :
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```
Sémantique : le groupe = **workflow + référence Git** → une nouvelle exécution n'annule que les exécutions **précédentes du même workflow sur la même référence** ; jamais une autre branche, jamais un autre workflow, jamais les `pull_request` indépendants. `cancel-in-progress: true` = annulation des obsolètes uniquement.

**Invariants vérifiés inchangés** : déclencheurs (`push`, `pull_request`) · Node `24` · cache npm (2 lockfiles) · `npm ci` racine · `npm run lint` · `npm run build` · `npm ci` (`Backend`) · `node --test tests/*.test.mjs` (`Backend`) · aucune étape ajoutée/supprimée (**7 steps**).

## 3. Résultats des validations

| Validation | Méthode | Résultat |
|---|---|---|
| YAML | `js-yaml.load` | ✅ `YAML_OK` |
| `permissions` | lecture parsée | ✅ `{"contents":"read"}` |
| `concurrency` | lecture parsée | ✅ group = `${{ github.workflow }}-${{ github.ref }}`, cancel = `true` |
| `timeout-minutes` | lecture parsée | ✅ `15` |
| Commandes/steps/déclencheurs/Node | lecture parsée | ✅ inchangés (5 `runs` attendus, 7 steps, Node 24, triggers push/PR) |
| Secrets codés en dur | grep parsé | ✅ **0** |
| Étapes de déploiement | grep parsé | ✅ **0** |
| `npm run lint` (local) | exécuté | ✅ **exit 0** |
| `node --test tests/*.test.mjs` (local) | exécuté | ✅ **exit 0 · tests 36 · pass 36 · fail 0** |
| `npm run build` (local) | inchangé depuis Lot 5B | ✅ **exit 0 · 22/22** (code non modifié par ce lot) |

## 4. Confirmation de périmètre
- **Fichier modifié** : `.github/workflows/ci.yml` **uniquement**.
- **Fichier créé** : `LOT5C_CI_HARDENING_REPORT.md` **uniquement**.
- Aucun fichier applicatif, lockfile, script npm, test, `.env`, migration, config Neon/TLS/pool modifié.

## 5. Limites restantes et validation GitHub Actions
⚠️ **Aucune exécution GitHub observée** (push interdit dans ce lot). Pour valider Actions réellement :
1. Pousser la branche (commit de consolidation, autorisé explicitement) → observer l'onglet **Actions** du dépôt.
2. Vérifier : job `quality` vert, durée < 15 min, cache npm actif, permissions affichées = `contents: read`.
3. Pousser deux commits rapprochés sur la même branche → vérifier l'**annulation** de la première exécution (CI-03).
4. Vérifier qu'un push sur une autre branche **n'annule rien** (isolation par `github.ref`).

---

**→ LOT 5C TERMINÉ — CI-01/CI-02/CI-03 corrigés et validés localement (YAML + commandes vertes : 36/36). ARRÊT : attente de votre autorisation explicite (commit/push pour observation GitHub = lot ultérieur).**