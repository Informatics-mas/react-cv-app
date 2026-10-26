# LOT 1 — RÉSILIENCE RÉSEAU NEON — RAPPORT D'AUDIT (LECTURE SEULE)

**Date :** 26/10/2026 · Aucune modification de configuration, de code ou de TLS · aucun test de charge ni test prolongé sur la production.

---

## 1. Résumé exécutif
Le pool PostgreSQL est **correctement configuré** (TLS strict, `min: 0`, keep-alive, timeouts adaptés) et les erreurs `ETIMEDOUT`/`ENETUNREACH` sont **intermittentes et externes à l'application** (réseau WSL + réveil/endpoint Neon). **Non reproduites** lors du test ponctuel de cet audit (3/3 OK) — mais **historiquement prouvées** (9 rapports, observations en direct). L'option `--dns-result-order=ipv4first` reste **pertinente et non appliquée**. **Statut : PARTIEL.**

## 2. Statut des vérifications

| Vérification | Statut | Résultat |
|---|---|---|
| Configuration du pool et TLS | **VALIDÉ** | `min: 0`, `max: 8`, `connectionTimeoutMillis: 30s`, `idleTimeoutMillis: 30s`, `keepAlive` (+10 s), `ssl: {rejectUnauthorized:true}` via `PGSSL=require` — **aucune désactivation TLS** |
| Scripts de démarrage / options DNS | **VALIDÉ** | `dev` = `node --watch server.js`, `start` = `node server.js` · `--dns-result-order` / `autoSelectFamily` = **0 occurrence** (non appliqué ✓) |
| Traces d'erreurs | **VALIDÉ** | **9 rapports** documentent `ETIMEDOUT`/`ENETUNREACH` (reproductions, diagnostics) |
| Reproductibilité | **PARTIEL** | Test ponctuel (3× `SELECT 1`, 3 s d'écart) = **T1=OK 6717ms · T2=OK 594ms · T3=OK 517ms** — non reproduit maintenant ; historique : épisodes transitoires (reproduction directe + logs utilisateur) |
| Pertinence `ipv4first` | **VALIDÉ (évaluation)** | Voir §6 |
| `npm run dev` vs `start` | **VALIDÉ** | `--watch` = redémarrage auto (= rechargement du code, cause du « bug » plans) ; `start` = code figé (**tout correctif exige un redémarrage**) |
| Risques retries/TLS/pool | **VALIDÉ** (analyse) | Voir §8 |

## 3. Fichiers et configurations concernés
`Backend/db/pool.js` (config) · `Backend/package.json` (`dev`/`start`) · `Backend/loadEnv.js` (chargement env) · `Backend/server.js` (fail-fast `ping()`) · `.env` (`DATABASE_URL` sans `sslmode`, `PGSSL=require` — valeurs non affichées).

## 4. Commandes réellement exécutées
| Commande | Code de sortie | Résultat |
|---|---|---|
| Lecture `pool.js` / `package.json` (grep) | 0 | config relevée ci-dessus |
| `node /tmp/audit-lots.mjs` (collecte) | 0 | `DNS_OPT_PKG=0` · `RAPPORTS_AVEC_ETIMEDOUT=9` |
| **`node /tmp/net-check2.mjs`** (3× `SELECT 1`, TLS strict, espace 3 s) | 0 | **T1=OK 6717ms \| T2=OK 594ms \| T3=OK 517ms** |

## 5. Preuves et résultats
- **Faits** : la première connexion TLS prend **6,7 s** ici (historique : 7-19 s mesurés) — d'où `connectionTimeoutMillis: 30 s` (cohérent) ; les suivantes ≈ 500-600 ms.
- **Faits historiques (rapports)** : `AggregateError [ETIMEDOUT]` sur les 3 IPv4 du pooler + `ENETUNREACH` sur les IPv6 ; coupures de connexions inertes à ~7,6 min (`min: 2` — depuis corrigé) ; épisodes de démarrage échoués puis succès.
- **Hypothèses (non démontrées)** : réveil « Scale to Zero » de Neon ; instabilité passagère du réseau WSL/entreprise ; ordre DNS parfois IPv6 d'abord (cause des `ENETUNREACH`).

## 6. Solution proposée — `--dns-result-order=ipv4first`
| | Détail |
|---|---|
| **Principe** | Forcer l'ordre DNS IPv4 d'abord → plus de tentative IPv6 → **supprime les `ENETUNREACH`** |
| **Avantages** | Zéro code, prouvé (`FAMILLE=4` garantie en test), supprime le bruit et le temps mort IPv6 |
| **Risques** | Faibles : si un endpoint devient IPv4-only… (déjà le cas ici) ; option Node ≥ 16 ; comportement identique Windows/WSL |
| **Application proposée** | `Backend/package.json` : `"dev": "node --dns-result-order=ipv4first --watch server.js"` et `"start": "node --dns-result-order=ipv4first server.js"` (ou `NODE_OPTIONS`) |
| **Critères de validation** | 0 `ENETUNREACH` dans les logs sur 24 h · aucune régression de connexion · `T1` de reprise toujours < `connectionTimeoutMillis` |

**Non appliqué** (conformément à la mission).

## 7. Tests non exécutés et raisons
- **Tests de charge / sessions prolongées** : interdits par la mission (production).
- Reproduction active des `ETIMEDOUT` : **non déterministe** (transitoire) — non forcé.
- Tests IPv6 end-to-end : non nécessaires (cause connue : WSL sans route IPv6 sortante).

## 8. Risques identifiés
- **AN-01 (élevé)** : épisodes `ETIMEDOUT` persistants → 503/refus transitoires pour l'utilisateur (déjà classés en erreur serveur/réseau — **jamais** en « session expirée »).
- **Risque si retry applicatif ajouté** : interdit (fail-closed assumé) — masquerait les pannes et dégraderait l'idempotence.
- **Risque si TLS affaibli** : interdit (validation stricte conservée).
- `--watch` en dev : tout changement de fichier = redémarrage (utile, mais à connaître).

## 9. Corrections recommandées (non appliquées)
1. Appliquer `ipv4first` aux scripts backend (§6).
2. Monitoring : compter les `ETIMEDOUT` en production avant/après.
3. Si les épisodes persistent : investiguer côté Neon (quotas, Scale to Zero) ou réseau — hors application.

## 10. Critères de validation d'un futur lot
- Scripts `dev`/`start` avec `ipv4first` + lint/build/tests verts.
- 24 h de logs sans `ENETUNREACH` ; les `ETIMEDOUT` mesurés avant/après (comparaison).
- Aucun changement de TLS/pool/retry.

**STATUT DU LOT 1 : PARTIEL** (diagnostic complet, solution proposée, application non autorisée).