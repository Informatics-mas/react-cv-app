#!/usr/bin/env node
/**
 * Phase 5H — Étape A/E : inventaire LECTURE SEULE des comptes utilisateurs.
 * Aucune écriture. Emails masqués dans la sortie (pas de PII en clair).
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../Backend/package.json"));
require("dotenv").config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "../../Backend/.env") });
const pg = require("pg");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: true } : undefined,
  max: 1,
  connectionTimeoutMillis: 30_000
});

const mask = (e) => String(e).replace(/^(.{2}).*(@.*)$/, "$1***$2");

try {
  const { rows } = await pool.query(
    `SELECT id, email, role, user_plan, user_max_downloads, downloads_used, created_at
       FROM users ORDER BY created_at ASC LIMIT 40`
  );
  for (const r of rows) {
    console.log(
      r.id, mask(r.email), r.role, r.user_plan,
      `max=${r.user_max_downloads}`, `used=${r.downloads_used}`,
      r.created_at.toISOString().slice(0, 10)
    );
  }
  const { rows: [{ n }] } = await pool.query("SELECT count(*)::int AS n FROM users");
  console.log("TOTAL_USERS:", n);
  const { rows: plans } = await pool.query("SELECT name, max_downloads, price FROM plans ORDER BY price");
  console.log("PLANS:", JSON.stringify(plans));
} catch (e) {
  console.error("ERR", e.code || "", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
