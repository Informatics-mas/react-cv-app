#!/usr/bin/env node
/**
 * Lot 2G.4F — Tests TLS strict + gardes de cible + purge contrôlée (T/G/P).
 *
 * ISOLATION : base jetable DÉDIÉE cvc_tlsfix_2g4f uniquement ; identité prouvée
 * avant toute écriture (endpoint de test imposé, refus sinon) ; cible fournie
 * via CVC_TEST_ADMIN_URL explicite ; aucune lecture de .env ; données 100 %
 * synthétiques ; les sous-processus testés (purge) reçoivent un environnement
 * MINIMAL et contrôlé (jamais de DATABASE_URL héritée).
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import {
  assertTestTarget, assertNotProduction, classifyTarget, strictSslOptions,
  PURGE_CONFIRM_TOKEN,
} from "../lib/safe-target.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "../../Backend/package.json"));
const pg = require("pg");

const TARGET_DB = "cvc_tlsfix_2g4f";
const TEST_ENDPOINT = "ep-ancient-glitter-b98wmcx7";
const results = [];
function check(id, label, pass, evidence) {
  results.push({ id, pass });
  console.log(`${pass ? "PASS" : "FAIL"} | ${id} ${label} | ${evidence}`);
}
const sqlErr = (e) => `${e.code || "?"} ${String(e.message).split("\n")[0]}`;

// ---------- Garde d'identité du HARNAIS (avant toute écriture) ----------
const adminUrl = process.env.CVC_TEST_ADMIN_URL;
if (!adminUrl) { console.error("REFUS : CVC_TEST_ADMIN_URL absente."); process.exit(2); }
const u = new URL(adminUrl);
if (!u.hostname.includes(TEST_ENDPOINT)) {
  console.error(`REFUS : hôte '${u.hostname}' ≠ endpoint de test ${TEST_ENDPOINT}.`);
  process.exit(2);
}
console.log(`IDENTITE_OK endpoint=${u.hostname} base_cible=${TARGET_DB}`);
const urlFor = (db) => { const t = new URL(adminUrl); t.pathname = `/${db}`; return t.toString(); };

// ---------- Création de la base jetable (depuis template1) ----------
const maint = new pg.Pool({ connectionString: urlFor("template1"), max: 1, connectionTimeoutMillis: 30000 });
try {
  await maint.query(`CREATE DATABASE ${TARGET_DB}`);
  console.log(`BASE_JETABLE_CREEE ${TARGET_DB}`);
} catch (e) {
  if (e.code !== "42P04") { console.error(`REFUS CREATE DATABASE : ${sqlErr(e)}`); process.exit(2); }
  console.log(`BASE_JETABLE_EXISTE ${TARGET_DB} — réutilisée`);
}
await maint.end();
const pool = new pg.Pool({ connectionString: urlFor(TARGET_DB), max: 1, connectionTimeoutMillis: 30000 });
await pool.query(fs.readFileSync(path.resolve("Backend/db/schema/001_initial.sql"), "utf8"));
console.log("SCHEMA_OK 001_initial.sql appliqué");

// ================= TLS (unitaires — aucun réseau) =================
{
  const s = strictSslOptions({ PGSSL: "require" });
  check("T1", "TLS strict : rejectUnauthorized=true quand PGSSL=require",
    s && s.rejectUnauthorized === true && Object.keys(s).length === 1,
    `ssl=${JSON.stringify(Object.keys(s || {}))}`);
}
{
  check("T2", "mode local préservé : PGSSL absent ⇒ ssl undefined",
    strictSslOptions({}) === undefined, "ssl=undefined");
}
{
  const tmp = path.join(os.tmpdir(), `cvc-ca-${Date.now()}.pem`);
  fs.writeFileSync(tmp, "-----BEGIN CERTIFICATE-----\nTEST\n-----END CERTIFICATE-----\n");
  const s = strictSslOptions({ PGSSL: "require", CVC_TLS_CA_FILE: tmp });
  check("T3", "CA explicite injectable (certificats synthétiques) sans désactivation",
    s && s.rejectUnauthorized === true && Buffer.isBuffer(s.ca), `ca=${Buffer.isBuffer(s?.ca)} strict=${s?.rejectUnauthorized}`);
  fs.unlinkSync(tmp);
}
{
  let bad = [];
  // Motif reconstruit (évite l'auto-détection du littéral dans ce fichier).
  const needle = ["rejectUnauthorized", "false"].join(": ");
  const roots = ["Backend", "scripts"];
  const walk = (dir) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) { if (f.name !== "node_modules") walk(p); }
      else if (f.name.endsWith(".js") && f.name !== "test-tls-guards.js"
        && fs.readFileSync(p, "utf8").includes(needle)) bad.push(p);
    }
  };
  roots.forEach((r) => walk(r));
  check("T4", "plus AUCUNE désactivation TLS dans Backend/ et scripts/", bad.length === 0,
    bad.length ? bad.join(",") : "0 occurrence");
}
{
  const r = spawnSync(process.execPath, [path.resolve("scripts/phase5j/test-tls-strict.js")],
    { encoding: "utf8", timeout: 120000 });
  const ok = r.status === 0 && /6\/6 PASS/.test(r.stdout || "");
  check("T5", "comportement TLS expérimental (approuvé/non approuvé/nom d'hôte/pas de fallback)",
    ok, (r.stdout || "").split("\n").filter((l) => l.includes("BILAN")).join("") || r.stderr.slice(0, 100));
}

// ================= Gardes de cible =================
{
  let ok = false, ev = "";
  try {
    const id = await assertTestTarget({ url: urlFor(TARGET_DB), expectedDb: TARGET_DB });
    ok = id.db === TARGET_DB;
    ev = `base=${id.db} role=${id.user} serveur=${id.server}`;
  } catch (e) { ev = e.message; }
  check("G1", "cible jetable autorisée acceptée (identité réelle confirmée)", ok, ev);
}
{
  const c = classifyTarget("postgresql://u@evil.example.com/cvc_x");
  check("G2", "cible inconnue refusée AVANT connexion (hôte hors liste)",
    c.errors.length > 0, c.errors.join(" ; "));
}
{
  let thrown = false, ev = "";
  try { assertNotProduction({ NODE_ENV: "production" }); }
  catch (e) { thrown = true; ev = e.message.slice(0, 60); }
  check("G3", "configuration de production refusée", thrown, ev);
}
{
  const dbs = ["postgres", "neondb", "cvc_rehearsal", "template1"];
  const refused = dbs.every((db) =>
    classifyTarget(`postgresql://u@${TEST_ENDPOINT}.example/${db}`).errors.length > 0);
  check("G4", "bases persistantes/système refusées (postgres, neondb, cvc_rehearsal, template1)",
    refused, `refusées=${dbs.length}/4`);
}
{
  let thrown = false, ev = "";
  try { await assertTestTarget({ url: urlFor(TARGET_DB), expectedDb: "cvc_autre" }); }
  catch (e) { thrown = true; ev = e.message.slice(0, 70); }
  check("G5", "contradiction URL ↔ base attendue refusée", thrown, ev);
}

// ================= Purge — sous-processus à environnement minimal =================
const PURGE = path.resolve("scripts/phase5h/purge-temp-users.js");
const runPurge = (env) => spawnSync(process.execPath, [PURGE], {
  encoding: "utf8", timeout: 120000,
  env: { PATH: process.env.PATH, ...env },
});
const countUsers = async () => (await pool.query("SELECT count(*)::int AS n FROM users")).rows[0].n;

// Jeu synthétique (idempotent) : 3 comptes dans le périmètre, 1 hors périmètre.
const rnd = () => Math.random().toString(36).slice(2, 10);
for (const mail of ["a", "b", "c"]) {
  await pool.query(
    "INSERT INTO users (name, email, password, role) VALUES ($1, $2, 'x', 'user')",
    [`seed-${mail}`, `phase5h-${mail}-${rnd()}@test.local`]);
}
await pool.query(
  "INSERT INTO users (name, email, password, role) VALUES ('autre', 'other@test.local', 'x', 'user') " +
  "ON CONFLICT (email) DO NOTHING");
const before = await countUsers();
const scopedBefore = (await pool.query(
  "SELECT count(*)::int AS n FROM users WHERE email LIKE 'phase5h-%@test.local'")).rows[0].n;

{ // P0/G6 — sans confirmation : REFUS par défaut, aucune suppression
  const r = runPurge({});
  const after = await countUsers();
  check("P0", "purge REFUSÉE par défaut (aucune suppression, aucune connexion)",
    r.status === 2 && /REFUS/.test(r.stderr) && after === before,
    `exit=${r.status} users ${before}→${after}`);
}
{ // P1 — cible persistante (dbname postgres) : refus AVANT connexion
  const r = runPurge({
    CVC_TEST_DB_URL: urlFor("postgres"),
    CVC_PURGE_CONFIRM: PURGE_CONFIRM_TOKEN,
  });
  const after = await countUsers();
  check("P1", "purge refusée sur base persistante (pre-connexion)", r.status === 2 && /interdite/.test(r.stderr) && after === before,
    `exit=${r.status} ${r.stderr.split("\n")[0].slice(0, 60)}`);
}
{ // P2 — configuration de production : refus
  const r = runPurge({
    CVC_TEST_DB_URL: urlFor(TARGET_DB),
    CVC_PURGE_CONFIRM: PURGE_CONFIRM_TOKEN,
    NODE_ENV: "production",
  });
  check("P2", "purge refusée en configuration de production", r.status === 2 && /production/.test(r.stderr),
    `exit=${r.status}`);
}
{ // G5b — DATABASE_URL héritée ne peut PAS sélectionner la cible
  const r = runPurge({
    DATABASE_URL: urlFor(TARGET_DB), // héritée : doit être ignorée
    CVC_PURGE_CONFIRM: PURGE_CONFIRM_TOKEN,
  });
  check("G5b", "DATABASE_URL héritée sans cible explicite ⇒ REFUS", r.status === 2 && /explicite/.test(r.stderr),
    `exit=${r.status} ${r.stderr.split("\n")[0].slice(0, 60)}`);
}
{ // P3 — purge contrôlée sur jetable, TLS strict (PGSSL=require), données synthétiques
  const r = runPurge({
    CVC_TEST_DB_URL: urlFor(TARGET_DB),
    CVC_PURGE_CONFIRM: PURGE_CONFIRM_TOKEN,
    PGSSL: "require",
  });
  const after = await countUsers();
  const restantsScope = (await pool.query(
    "SELECT count(*)::int AS n FROM users WHERE email LIKE 'phase5h-%@test.local'")).rows[0].n;
  const autrePresent = (await pool.query(
    "SELECT count(*)::int AS n FROM users WHERE email = 'other@test.local'")).rows[0].n === 1;
  check("P3", "purge contrôlée : périmètre purgé, hors périmètre conservé, TLS strict",
    r.status === 0 && new RegExp(`Purge : ${scopedBefore}`).test(r.stdout) &&
    after === before - scopedBefore && restantsScope === 0 && autrePresent,
    `exit=${r.status} purgés=${scopedBefore} restants=${after} scope_restant=${restantsScope} autre=${autrePresent}`);
}

const failed = results.filter((x) => !x.pass).length;
console.log(`\nBILAN TLS-GUARDS: ${results.length - failed}/${results.length} PASS — base jetable ${TARGET_DB} conservée (preuve)`);
await pool.end();
process.exit(failed === 0 ? 0 : 1);

