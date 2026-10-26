#!/usr/bin/env node
/**
 * Lot 2G.4C — Harnais TLS isolé (T1-T5) pour la validation du durcissement TLS.
 *
 * ISOLATION GARANTIE :
 * - Aucune base de données, persistante ou non, n'est contactée : T1-T4 utilisent
 *   uniquement le module `tls` de Node contre des serveurs TLS locaux éphémères ;
 * - certificats et clés SYNTHÉTIQUES générés par openssl dans un répertoire
 *   temporaire système (aucun secret réel, hors dépôt) ;
 * - aucun serveur applicatif CV.CRAFT ; aucun fichier .env lu ni modifié ;
 * - T5 importe Backend/db/pool.js avec des variables d'environnement INERTES
 *   (cible 127.0.0.1:9 = discard) pour inspecter l'objet de configuration réel
 *   du pool sans jamais établir de connexion.
 *
 * RÉFÉRENCE TESTÉE : l'objet `ssl` réellement construit par Backend/db/pool.js
 * (`pool.options.ssl`), pas une reconstruction.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import tls from "node:tls";
import { pathToFileURL } from "node:url";

const results = [];
function check(id, label, pass, evidence) {
  results.push({ id, pass });
  console.log(`${pass ? "PASS" : "FAIL"} | ${id} ${label} | ${evidence}`);
}

// 1. Certificats de test synthétiques (openssl)
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cvc-tls-strict-"));
const p = (f) => path.join(dir, f);
const run = (args) => execFileSync("openssl", args, { stdio: ["ignore", "pipe", "pipe"] });

run(["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", p("ca.key"), "-out", p("ca.crt"),
  "-days", "2", "-subj", "/CN=cvc-tls-test-ca",
  "-addext", "basicConstraints=critical,CA:TRUE",
  "-addext", "keyUsage=critical,keyCertSign,cRLSign"]);
run(["req", "-newkey", "rsa:2048", "-nodes", "-keyout", p("good.key"), "-out", p("good.csr"),
  "-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1"]);
run(["x509", "-req", "-in", p("good.csr"), "-CA", p("ca.crt"), "-CAkey", p("ca.key"),
  "-CAcreateserial", "-out", p("good.crt"), "-days", "2", "-copy_extensions", "copy"]);
run(["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", p("untrusted.key"),
  "-out", p("untrusted.crt"), "-days", "2", "-subj", "/CN=localhost",
  "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1"]);
run(["req", "-newkey", "rsa:2048", "-nodes", "-keyout", p("wrong.key"), "-out", p("wrong.csr"),
  "-subj", "/CN=wrong.example.com", "-addext", "subjectAltName=DNS:wrong.example.com"]);
run(["x509", "-req", "-in", p("wrong.csr"), "-CA", p("ca.crt"), "-CAkey", p("ca.key"),
  "-CAcreateserial", "-out", p("wrong.crt"), "-days", "2", "-copy_extensions", "copy"]);

// 2. Configuration TLS RÉELLE du pool applicatif (environnement inert)
process.env.DATABASE_DRIVER = "postgres";
process.env.DATABASE_URL = "postgresql://cvc_tls_test@127.0.0.1:9/cvc_tls_test"; // port discard
process.env.PGSSL = "require";
const { pool } = await import(pathToFileURL(path.resolve("Backend/db/pool.js")).href);
const appSsl = pool.options.ssl;

// 3. Serveur TLS local éphémère + client de test
function startServer(key, cert) {
  const server = tls.createServer({ key, cert });
  let handshakes = 0;
  server.on("secureConnection", () => { handshakes += 1; });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () =>
      resolve({ server, port: server.address().port, count: () => handshakes }));
  });
}
function tryConnect(port, options) {
  return new Promise((resolve) => {
    const sock = tls.connect({ host: "127.0.0.1", port, ...options }, () => {
      resolve({ ok: true, authorized: sock.authorized });
      sock.end();
    });
    sock.on("error", (err) => resolve({ ok: false, code: err.code, message: err.message }));
  });
}

const caCert = fs.readFileSync(p("ca.crt"));
const good = await startServer(fs.readFileSync(p("good.key")), fs.readFileSync(p("good.crt")));
const untrusted = await startServer(fs.readFileSync(p("untrusted.key")), fs.readFileSync(p("untrusted.crt")));
const wrong = await startServer(fs.readFileSync(p("wrong.key")), fs.readFileSync(p("wrong.crt")));

// T1 — Certificat valide et approuvé. `ca: [caCert]` simule une CA publique
// présente dans le magasin système (rien n'est installé dans le magasin) ;
// `rejectUnauthorized` reste strictement la valeur de l'app (true).
const t1 = await tryConnect(good.port, { ...appSsl, ca: [caCert] });
check("T1", "certificat approuvé accepté (validation active)", t1.ok === true && t1.authorized === true,
  `secureConnect=${t1.ok} authorized=${t1.authorized} rejectUnauthorized=${appSsl.rejectUnauthorized}`);

// T2 — Certificat non approuvé (auto-signé) : rejet attendu.
// Configuration = objet `ssl` RÉEL de l'app, sans modification.
const t2 = await tryConnect(untrusted.port, { ...appSsl });
const t2Rejected = t2.ok === false && /CERT|SELF_SIGNED|UNABLE_TO/i.test(String(t2.code));
check("T2", "certificat non approuvé rejeté", t2Rejected, `connecté=${t2.ok} code=${t2.code}`);

// T3 — Nom d'hôte incorrect (chaîne approuvée, SAN erroné) : rejet attendu.
const t3 = await tryConnect(wrong.port, { ...appSsl, ca: [caCert] });
const t3Rejected = t3.ok === false && /ALTNAME|MISMATCH|HOSTNAME/i.test(String(t3.code));
check("T3", "nom d'hôte incorrect rejeté", t3Rejected, `connecté=${t3.ok} code=${t3.code}`);

// T4 — Échec fermé : aucun fallback non vérifié, aucune nouvelle tentative en
// mode désactivé ; le serveur ne voit AUCUNE négociation aboutie.
const t4a = await tryConnect(untrusted.port, { ...appSsl });
const t4b = await tryConnect(untrusted.port, { ...appSsl });
const poolSrc = fs.readFileSync(path.resolve("Backend/db/pool.js"), "utf8");
const ruCount = (poolSrc.match(/rejectUnauthorized/g) || []).length;
const strictOnly = /rejectUnauthorized:\s*true/.test(poolSrc) && !/rejectUnauthorized:\s*false/.test(poolSrc);
check("T4", "échec fermé : pas de fallback, 0 négociation aboutie",
  t4a.ok === false && t4b.ok === false && untrusted.count() === 0 && ruCount === 1 && strictOnly,
  `tentatives=${t4a.ok},${t4b.ok} handshakes_serveur=${untrusted.count()} occurrences=${ruCount} strict_seul=${strictOnly}`);

// T5 — Régression de configuration : paramètres applicatifs légitimes préservés,
// gestion d'erreurs et fermeture du pool intactes, aucune base persistante.
const o = pool.options;
const cfgOk = o.max === 8 && o.min === 2 && o.connectionTimeoutMillis === 30_000 &&
  o.idleTimeoutMillis === 30_000 && o.keepAlive === true &&
  o.keepAliveInitialDelayMillis === 10_000;
const apiOk = typeof pool.on === "function" && typeof pool.end === "function" &&
  typeof pool.query === "function" && typeof pool.connect === "function";
const sslShapeOk = appSsl && appSsl.rejectUnauthorized === true &&
  Object.keys(appSsl).length === 1; // aucune option de contournement cachée
check("T5", "paramètres du pool préservés + API inchangée + config ssl minimale",
  cfgOk && apiOk && sslShapeOk,
  `max=${o.max} min=${o.min} connTimeout=${o.connectionTimeoutMillis} idle=${o.idleTimeoutMillis} keepAlive=${o.keepAlive} sslKeys=[${Object.keys(appSsl || {})}] api=${apiOk}`);

// T5b — Mode local préservé : PGSSL absent => ssl undefined (comportement d'origine).
const srcLocal = /PGSSL === "require" \? \{ rejectUnauthorized: true \} : undefined/.test(poolSrc);
check("T5b", "mode local inchangé (PGSSL absent => ssl undefined)", srcLocal, `pattern_source=${srcLocal}`);

// Clôture — fermeture propre du pool et des serveurs de test.
await pool.end();
for (const s of [good, untrusted, wrong]) {
  await new Promise((r) => s.server.close(r));
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\nBILAN TLS-STRICT: ${results.length - failed}/${results.length} PASS — certificats : ${dir}`);
process.exit(failed === 0 ? 0 : 1);

