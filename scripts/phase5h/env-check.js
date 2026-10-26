#!/usr/bin/env node
/**
 * Phase 5H — Étape A : vérification de configuration MASQUÉE.
 * N'imprime jamais DATABASE_URL, mots de passe ou secrets — uniquement des booléens.
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../Backend/package.json"));
require("dotenv").config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "../../Backend/.env") });

const u = new URL(process.env.DATABASE_URL || "");
console.log("DATABASE_DRIVER      =", process.env.DATABASE_DRIVER || "(absent)");
console.log("PGSSL                =", process.env.PGSSL || "(absent)");
console.log("host_is_supabase     =", u.hostname.includes("supabase"));
console.log("host_is_pooler       =", u.hostname.includes("pooler"));
console.log("port                 =", u.port || "(défaut)");
console.log("user_is_pooler       =", (u.username || "").includes("pooler"));
console.log("sslmode_in_url       =", u.searchParams.get("sslmode") || "(absent)");
console.log("password_present     =", Boolean(u.password));
console.log("JWT_SECRET_present   =", Boolean(process.env.JWT_SECRET));
