# Cutover / Rollback — CV.CRAFT (Phase 5D)

## État actuel

```env
# Backend/.env
DATABASE_DRIVER=postgres   # cutover Phase 5D
DATABASE_URL=...            # PostgreSQL (local de test ici ; Supabase en prod)
PGSSL=require               # à activer pour Supabase (pas en local)
```

## ROLLBACK immédiat (en cas de test critique échoué)

```env
DATABASE_DRIVER=mongo
```

puis **redémarrer le backend**. Aucune autre action requise :

- MongoDB est **intact** (source de référence, snapshot + checksums dans `scripts/migrate/data/`) ;
- les modèles Mongoose et `db/mongoStore.js` restent en place (fallback permanent) ;
- `legacy_object_id` et `id_map` conservent la correspondance ObjectId ↔ UUID
  dans les deux sens.

## Repasser en PostgreSQL (roll-forward)

```env
DATABASE_DRIVER=postgres
```

puis redémarrer le backend.

## Points de sauvegarde

| Élément | Emplacement | État |
|---|---|---|
| Snapshot MongoDB (logique + SHA256) | `scripts/migrate/data/` | conservé, hors Git |
| Données PostgreSQL migrées | table `users/plans/subscriptions` (`legacy_object_id` NOT NULL) | conservées |
| Mapping ObjectId ↔ UUID | `id_map` + `legacy_object_id` | conservé |
| Configuration Mongo | `Backend/.env` (`MONGO_URI`) | conservée |

## Supabase (production)

Le cutover a été validé sur **PostgreSQL 18 local** (même SQL `001_initial.sql`).
Pour Supabase réel : renseigner `DATABASE_URL` (pooler Supabase) + `PGSSL=require`,
appliquer `Backend/db/schema/001_initial.sql`, puis importer via `scripts/migrate/`
(snapshots disponibles).