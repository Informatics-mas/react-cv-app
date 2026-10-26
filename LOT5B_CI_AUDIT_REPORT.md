# LOT 5B — AUDIT CI / COMPATIBILITÉ GITHUB ACTIONS — RAPPORT

**Date :** 26/10/2026 · **AUDIT STRICT** — aucun fichier modifié (hors ce rapport) · aucun commit/push/déploiement · aucun secret affiché.

---

## 1. Résumé exécutif
Le workflow `.github/workflows/ci.yml` (Lot 5A) est **syntaxiquement valide, cohérent avec le dépôt et fonctionnel en local** : les 3 commandes qu'il exécute sont reproductibles (lint 0, **36/36**, build 22/22) et **n'exigent aucun secret ni service externe**. **Anomalies** : `permissions:` absente (défaut trop large), pas de `timeout-minutes` ni `concurrency` (robustesse) — **non bloquantes** mais à corriger. **Verdict : PRÊT SOUS CONDITIONS** (§7).

## 2. État Git

| | Initial | Final |
|---|---|---|
| `git status --short` | `5 D / 40 M / 90 ?? / 7 D` | `5 D / 40 M / 91 ?? / 7 D` (+1 = ce rapport) |

**Confirmé** : workflow et dépôt **inchangés** par cet audit · tous les préexistants préservés.

## 3. Résultats des contrôles A → E

### A. Déclencheurs et structure — **RÉUSSI (1 réserve)**
| Point | Résultat |
|---|---|
| Déclencheurs `push` + `pull_request` | ✅ `on: [push, pull_request]` |
| Syntaxe YAML | ✅ parsée (`js-yaml`) : `jobs=quality steps=7` (Lot 5A) |
| **Permissions minimales** | ⚠️ **absentes** — le `GITHUB_TOKEN` garde les permissions par défaut du dépôt → ajouter `permissions: { contents: read }` |
| Configuration job/étapes | ✅ job `quality`, `runs-on: ubuntu-latest`, étapes séquentielles (échec = stop, défaut Actions) |

### B. Environnement Node — **RÉUSSI**
| Point | Résultat |
|---|---|
| Node 24 vs projet | ✅ local = **v24.19.0** (cohérent) ; Next 15.5 + `node --test` compatibles |
| Cache npm + lockfiles | ✅ `cache: npm` + `cache-dependency-path` = les **2** lockfiles (racine + Backend) |
| `npm ci` ↔ lockfiles | ✅ racine ↔ `package-lock.json` ; `npm ci` (`working-directory: Backend`) ↔ `Backend/package-lock.json` |
| Répertoires d'exécution | ✅ `working-directory: Backend` pour l'install et les tests ; lint/build en racine |

### C. Contrôles exécutés — **RÉUSSI (vérifiés en local)**
| Étape du workflow | Exécutée localement | Code de sortie | Résultat |
|---|---|---|---|
| `npm run lint` | ✅ | **0** | 0 erreur |
| `npm run build` | ✅ | **0** | `22/22` |
| `cd Backend && npm ci` | ⚠️ **non rejoué** (réinstaller = interdit) — lockfile présent, commande standard | — | analysé : `npm ci` reproductible |
| `node --test tests/*.test.mjs` | ✅ | **0** | **tests 36 · pass 36 · fail 0** |

### D. Dépendances et services externes — **RÉUSSI**
| Point | Résultat |
|---|---|
| Variables d'environnement du build | ✅ `NEXT_PUBLIC_API_URL` = **fallback dans le code** (`client.js:21`) → build sans `.env` = OK · `JWT_SECRET` (`middleware.js:50`) = **runtime edge**, non évalué au build |
| Secrets requis | ✅ **aucun** (analyse + builds locaux) |
| Neon/GeniusPay en CI | ✅ **aucun accès** : tests = env injecté en mémoire (0 socket), build = SSG sans fetch (appels API = côté client) |
| Écritures/paiements possibles | ✅ **aucune** : 5 suites = pures (aucune écriture, aucun compte, aucun paiement) |

### E. Robustesse — **RÉUSSI (2 réserves)**
| Point | Résultat |
|---|---|
| Échec d'une étape | ✅ stop du job (comportement par défaut Actions) |
| Glob `tests/*.test.mjs` | ✅ expansion shell = OK sur `ubuntu-latest` (bash) |
| Reproductibilité | ✅ `npm ci` (lockfiles figés) |
| **`timeout-minutes`** | ⚠️ absent → un job bloqué peut consommer 6 h (défaut) |
| **`concurrency`** | ⚠️ absent → exécutions parallèles sur pushes rapprochés (gaspillage) |

## 4. Anomalies classées

| ID | Gravité | Anomalie | Correction proposée (non appliquée) |
|---|---|---|---|
| CI-01 | **Moyenne** | `permissions:` absente (token à droits larges par défaut) | Ajouter `permissions: { contents: read }` en tête |
| CI-02 | Faible | Pas de `timeout-minutes` | `timeout-minutes: 15` sur le job |
| CI-03 | Faible | Pas de `concurrency` | `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }` |
| CI-04 | Informationnelle | `npm ci` Backend non rejoué ici (interdiction de réinstaller) — validé par la présence du lockfile | — |
| CI-05 | Informationnelle | Node 24 = version de développement locale (pas forcément LTS sur le runner) | Préciser `node-version: 24.x` ou LTS si besoin |

## 5. Tableau des contrôles

| Contrôle | Statut |
|---|---|
| Déclencheurs push/PR | ✅ Réussi |
| YAML valide | ✅ Réussi |
| Permissions minimales | ❌ **Échoué** (absentes) |
| Node 24 + cache + lockfiles | ✅ Réussi |
| `npm ci` cohérents | ✅ Réussi (analysé) |
| `npm run lint` | ✅ Réussi (local, exit 0) |
| `npm run build` | ✅ Réussi (local, 22/22) |
| 36 tests backend | ✅ Réussi (local, 36/36) |
| 0 secret / 0 service externe | ✅ Réussi |
| 0 écriture / 0 paiement | ✅ Réussi |
| Timeout / concurrency | ❌ **Échoué** (absents) |
| **Exécution GitHub réelle** | ⬜ **Non vérifiée** (aucun push autorisé) |

## 6. Corrections recommandées (non appliquées)
1. **CI-01** : `permissions: { contents: read }` en tête du workflow (sécurité du token).
2. **CI-02** : `timeout-minutes: 15` sur le job `quality`.
3. **CI-03** : bloc `concurrency` avec `cancel-in-progress`.
4. Optionnel : job `integration` futur (base dédiée, secrets isolés) — séparé.

## 7. Verdict

## ✅ PRÊT SOUS CONDITIONS

**Prêt** : le workflow est valide, exécute réellement les 3 contrôles du projet (lint/build/36 tests), sans secret ni service externe, sans risque d'écriture ni de déploiement — **validé en local** (codes de sortie réels).
**Sous conditions** : corriger **CI-01** (permissions minimales — recommandé avant tout push dans un dépôt partagé) ; CI-02/03 = robustesse optionnelle.
⚠️ **Aucune exécution GitHub observée** (pas de push autorisé) — la compatibilité est **analysée et validée localement**, non confirmée par une exécution Actions réelle.

**→ ARRÊT OBLIGATOIRE — aucune correction appliquée ; attente de votre autorisation explicite (ex. : appliquer CI-01 à CI-03).**