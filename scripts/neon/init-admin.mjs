/**
 * Création sécurisée de l'administrateur initial (reconstruction Neon).
 *
 * USAGE :
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... node --env-file=Backend/.env scripts/neon/init-admin.mjs
 *
 * Sécurité :
 * - identifiants UNIQUEMENT via variables d'env (jamais en dur, jamais affichés) ;
 * - anti-double-admin : refus si un administrateur existe déjà ;
 * - mot de passe hashé bcrypt (genSalt 10) — identique à AuthRoute ;
 * - idempotent : un email déjà présent est signalé, jamais écrasé.
 */
import pg from "../../Backend/node_modules/pg/lib/index.js";
import bcrypt from "../../Backend/node_modules/bcryptjs/index.js";

const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || "");

if (!email || !password) {
  console.error("REFUS : ADMIN_EMAIL et ADMIN_PASSWORD doivent être fournis via l'environnement.");
  process.exit(1);
}
if (password.length < 12) {
  console.error("REFUS : ADMIN_PASSWORD doit contenir au moins 12 caractères.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.NEON_PROD_URL });
await client.connect();
try {
  const { rows: [{ n: adminCount }] } = await client.query(
    `SELECT count(*)::int AS n FROM users WHERE role = 'admin'`
  );
  if (adminCount >= 1) {
    console.error(`REFUS (anti-double-admin) : ${adminCount} administrateur(s) existant(s). Aucune écriture.`);
    process.exit(1);
  }
  const { rows: existing } = await client.query(
    `SELECT id, role FROM users WHERE email = $1`, [email]
  );
  if (existing.length > 0) {
    console.error(`REFUS : l'email existe déjà (role=${existing[0].role}). Aucune écriture.`);
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, await bcrypt.genSalt(10));
  const { rows: [u] } = await client.query(
    `INSERT INTO users (name, email, password, role, user_plan, user_max_downloads, downloads_used)
     VALUES ($1, $2, $3, 'admin', 'Free', 5, 0) RETURNING id, email, role`,
    ["Administrateur", email, hash]
  );
  console.log("ADMIN_CRÉÉ id=" + u.id + " role=" + u.role + " (mot de passe : non affiché)");
} finally {
  await client.end();
}