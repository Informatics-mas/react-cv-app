#!/usr/bin/env node
/**
 * Phase 5I — utilitaire commun : comptes de test temporaires (créés/supprimés),
 * JWT de test signés avec le mécanisme existant. Aucun secret n'est affiché.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const require = createRequire(path.join(here, "../../Backend/package.json"));
require("dotenv").config({ path: path.join(here, "../../Backend/.env") });
export const pg = require("pg");
export const jwt = require("jsonwebtoken");
export const bcrypt = require("bcryptjs");

export const API = (port) => `http://localhost:${port}/api`;

export function makePool() {
  return new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: true } : undefined,
    max: 2,
    connectionTimeoutMillis: 60_000
  });
}

let failures = 0;
export function check(name, ok, detail) {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | ${detail}`);
}
export function getFailures() { return failures; }

/** Crée un utilisateur de test isolé ; retourne { id, email, cookieToken } (à purger). */
export async function createTestUser(pool, { role = "user", suffix = "" } = {}) {
  const s = `${Date.now().toString(36)}${suffix}`;
  const email = `phase5i-${role}-${s}@test.local`;
  const hash = await bcrypt.hash("Phase5I!pass75", 10);
  const { rows: [u] } = await pool.query(
    `INSERT INTO users (name, email, password, role, user_plan, user_max_downloads, downloads_used)
     VALUES ($1, $2, $3, $4, 'Free', 5, 0) RETURNING id`,
    [`Phase5I ${role} ${s}`, email, hash, role]
  );
  return { id: u.id, email, password: "Phase5I!pass75" };
}

export async function purgeTestUsers(pool) {
  const { rowCount } = await pool.query(
    "DELETE FROM users WHERE email LIKE 'phase5i-%@test.local'"
  );
  return rowCount;
}

export function signToken(userId, role = "user", opts = {}) {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: "1h", ...opts });
}
