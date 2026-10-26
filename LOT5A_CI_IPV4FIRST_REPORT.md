# LOT 5A — CI MINIMALE + VALIDATION CONTRÔLÉE `ipv4first` — RAPPORT

**Date :** 26/10/2026 · Branche `dev` · Aucun déploiement/commit · aucune variable/`.env`/base/TLS/pool modifié · aucun fichier legacy touché.

---

## A. CI minimale

### Fichier créé
**`.github/workflows/ci.yml`** (nouveau — aucun workflow existant à écraser, vérifié `ls .github/workflows` = 0).

**Contenu** : `on: [push, pull_request]` · job `quality` (ubuntu-latest) : `checkout@v4` → `setup-node@v4` (**node 24** = version locale, cache npm sur les 2 lockfiles) → `npm ci` → `npm run lint` → `npm run build` → `cd Backend && npm ci` → `node --test tests/*.test.mjs`. **Aucune étape de déploiement, aucune migration, aucun accès Neon/GeniusPay, aucun secret.**

### Commandes réellement exécutées (validation locale)
| Commande | Code de sortie | Résultat |
|---|---|---|
| `node --test tests/*.test.mjs` (Backend — **commande exacte du workflow**) | **0** | **tests 36 · pass 36 · fail 0** |
| `npm run lint` (racine) | **0** | 0 erreur |
| `npm run build` (racine) | **0** | 22/22 (revérifié à l'audit global) |
| Validation YAML (`js-yaml.load`) | 0 | **`YAML_OK jobs=quality steps=7`** |
| `grep -ci 'secret|password|token|deploy|DATABASE_URL' ci.yml` | 1 | = **mon commentaire** (« Aucun secret requis ») — 0 secret codé, 0 déploiement |

### Notes techniques
- `npm test` backend = **placeholder** (`exit 1`) → la CI utilise la commande réelle `node --test tests/*.test.mjs` (**glob**, pas `node --test tests/` qui échoue sur ce Node).
- Les tests backend = **purs** (env injecté en mémoire, 0 base, 0 socket) — vérifié par l'audit : **aucun secret requis en CI**.
- `npm ci` = possible (lockfiles racine + Backend présents).

### Limites
- **Aucune exécution réelle sur GitHub** (pas de push ici) → **aucun succès GitHub revendiqué** — la CI est **validée en local** (commandes exécutées ci-dessus) et syntaxiquement conforme.
- Tests d'intégration (T12/13/16/18) **volontairement exclus** (base dédiée requise = job séparé futur).

## B. Réseau — diagnostic contrôlé `ipv4first`

### Configuration constatée
Node **v24.19.0** · `pg` **8.23.1** · pool : `min: 0`, `max: 8`, `connectionTimeoutMillis: 30s`, `idleTimeoutMillis: 30s`, `keepAlive`, **TLS strict** (`rejectUnauthorized: true`) · scripts : `dev` = `node --watch server.js`, `start` = `node server.js` (**aucune option DNS**) · rapports : **9** documentent `ETIMEDOUT`/`ENETUNREACH`.

### Méthode
- **Base de test utilisée** : `NEON_MIGR_URL` = branche **`migration-test`** (base `cvc_n2_final`) — **non-production explicitement identifiable** ✓ (jamais la production).
- Pour chaque config (**défaut** vs **`--dns-result-order=ipv4first`**) : **5 connexions séquentielles** (pool `max:1,min:0`, TLS strict, `SELECT 1`, espace 1,5 s), latences mesurées, erreurs comptées ; instrumentation légère de `net.Socket.connect` (script `/tmp`, hors projet).
- Complément : `dns.lookup` (famille choisie) dans les deux configs.

### Résultats
| Config | Latences | Erreurs | Famille DNS |
|---|---|---|---|
| **Défaut** | 1 réussie = **56 557 ms** (1re) | **4/5 échecs** | **IPv4** (`famille=4`) |
| **`ipv4first`** | 0 réussie | **5/5 échecs** | **IPv4** (`famille=4`, garantie) |

**Erreurs observées** : échecs de connexion (`ETIMEDOUT`/coupures) **dans les deux configurations** — et un avertissement pg connu (`sslmode` = alias `verify-full`) sans lien.

### Faits vs hypothèses
- **FAIT** : la **branche de test était indisponible/injoignable pendant toute la fenêtre de mesure** (les 2 configs échouent massivement) → **le test comparatif de performance est NON CONCLUANT** (facteur dominant = disponibilité de l'endpoint, pas l'ordre DNS).
- **FAIT** : aujourd'hui, le résolveur local choisit déjà **IPv4** dans les deux configs ; `ipv4first` **garantit** ce choix (vs non déterministe selon le DNS — cause historique des `ENETUNREACH`).
- **HYPOTHÈSE** : `ipv4first` supprimerait les `ENETUNREACH` — **cohérent** avec les mécanismes mais **non validé en conditions réelles** (la mesure n'a pas pu isoler ce facteur).
- **Famille d'adresse utilisée par les sockets pg** : **non confirmée** directement (l'instrumentation capturait l'hôte, pas la famille — à améliorer dans le test complémentaire).

### Conclusion et recommandation
1. **Maintenir la configuration actuelle** (aucune application de `ipv4first`) — bénéfice non prouvé dans les conditions mesurées.
2. **Test complémentaire isolé** : rejouer la comparaison quand la branche `migration-test` sera disponible (ou sur branche éphémère), avec capture de la **famille du socket** et 10+ essais par config.
3. **Future application** : si les `ENETUNREACH` réapparaissent dans les logs → appliquer `ipv4first` aux scripts backend (critères du Lot 1 : 0 `ENETUNREACH` sur 24 h).

## C. Git et périmètre

| | Initial | Final |
|---|---|---|
| `git status --short` | `5 D / 40 M / 88 ?? / 7 D` | `5 D / 40 M / 89 ?? / 7 D` (+2 = `ci.yml` + ce rapport) |

**Fichiers créés par cette mission** : `.github/workflows/ci.yml` + `LOT5A_CI_IPV4FIRST_REPORT.md` — **aucun autre fichier modifié** (code, config, tests, `.env`, migrations, pool, TLS = intacts) · **changepreexistants préservés** (88 → 89 non suivis, 40 M inchangés) · aucun commit/déploiement/reset.
**Anomalies/opérations bloquantes** : test comparatif réseau **non concluant** (branche de test indisponible) — documenté ; aucune opération bloquée pour la CI.

---

**→ LOT 5A TERMINÉ — CI créée et validée localement (36/36 · lint 0 · build 0), diagnostic `ipv4first` = non concluant (maintien de la config actuelle, test complémentaire à rejouer). ARRÊT : attente de votre analyse et autorisation explicite.**