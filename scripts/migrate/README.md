# scripts/migrate — archives de la migration MongoDB → PostgreSQL (Phase 5C)

> **Les scripts d'outil (extract/transform/import/compare/validate*) ont été SUPPRIMÉS** : la
> migration des données est abandonnée (nouvel objectif : **Neon uniquement**, base neuve sans
> import — voir `MIGRATION_NEON-FINAL-SUPPRESSION-SUPABASE-MONGODB.md`). MongoDB est retiré du
> runtime ; les données MongoDB existantes ne sont ni modifiées ni supprimées (hors périmètre code).

## Ce qui est conservé dans `data/`
- **`plans.json`** — **référence produit des 3 plans** (Free/Basic/Premium, valeurs exactes utilisées
  par le seed et les procédures N0/N2-P/N2-E6). **À ne pas supprimer.**
- Les autres fichiers (`users.json`, `load.sql`, `manifest.json`, `SHA256SUMS.txt`, …) = **artefacts
  historiques** de la migration de test du Lot 2B (compteurs, empreintes) — conservés comme preuves,
  sans usage runtime.

## Ordre d'exécution (après validation humaine)

```bash
# 0. Audit non destructif de la source (PASS/WARN/FAIL)
node scripts/migrate/validate-mongo.js "$MONGO_URI"

# 1. Extraction (lecture seule) → data/*.json + manifest.json
node scripts/migrate/extract.js "$MONGO_URI"

# 2. Transformation → data/load.sql + data/id_map.json
node scripts/migrate/transform.js

# 3. Import (UNE transaction, ON CONFLICT DO NOTHING → idempotent)
DATABASE_URL="$SUPABASE_DATABASE_URL" node scripts/migrate/import.js

# 4. Contrôles post-import (comptes, FK, id_map)
DATABASE_URL="$SUPABASE_DATABASE_URL" node scripts/migrate/validate.js
```

## Garanties

- **Non destructif** : aucune écriture MongoDB, aucun DELETE SQL ;
- **Idempotent** : `ON CONFLICT DO NOTHING` + reload réexécutable ;
- **Traçabilité** : `id_map(table_name, object_id, uuid)` + `legacy_object_id`
  sur chaque table (jamais exposés à l'API publique) ;
- **Rollback** : MongoDB intact (lecture seule) → retour `DATABASE_DRIVER=mongo`
  en une variable d'environnement ; les fichiers `data/` permettent un rejeu ;
- **Normalisations explicites** (rapportées en WARN par transform.js) :
  `user_plan 'Gratuit' → 'Free'`, `role 'premium' → 'user'` (le statut Premium
  se détermine par les plans/subscriptions, conformément au schéma cible).

## Avant toute exécution

1. Schéma appliqué : `Backend/db/schema/001_initial.sql` ;
2. `validate-mongo.js` sans FAIL (doublons `transactionReference` traités
   **manuellement** — jamais de suppression automatique) ;
3. Fenêtre de freeze écriteur convenue + `mongodump` de sécurité.