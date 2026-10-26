/**
 * Sélection du prestataire de paiement (Lot 2G) — validation stricte, fail-closed.
 *
 * Règles :
 * - DÉSACTIVÉ par défaut (PAYMENT_PROVIDER absent/none) → les paiements payants
 *   restent refusés par le garde-fou 503 historique ;
 * - le mock exige PLUSIEURS signaux positifs (jamais une seule variable) :
 *   PAYMENT_PROVIDER=mock ET PAYMENT_MOCK_ENABLED=true ET PAYMENT_MOCK_ENV
 *   valide ET PAYMENT_MOCK_ACK=MOCK-TEST-ONLY (autorisation explicite, Lot 2) ;
 * - le mock est REFUSÉ (exception au démarrage) si le moindre signal de
 *   production est détecté — NODE_ENV/APP_ENV=production, ou driver non
 *   PostgreSQL (Lot 4 : la décision ne dépend plus du fournisseur DB —
 *   ni de l'hôte, ni du nom de la base) ;
 * - GeniusPay n'est PAS implémenté : sa sélection lève une erreur explicite.
 */
export class PaymentConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "PaymentConfigError";
    this.code = "PAYMENT_CONFIG_INVALID";
  }
}

const MOCK_ENVS = new Set(["dev", "sandbox"]);

export function resolvePaymentProvider(env = process.env) {
  const provider = String(env.PAYMENT_PROVIDER || "none").trim().toLowerCase();
  if (provider === "" || provider === "none") {
    return { active: null, mock: false, reason: "no-provider" };
  }
  if (provider === "geniuspay") {
    throw new PaymentConfigError(
      "PAYMENT_PROVIDER=geniuspay refusé : GeniusPay n'est pas encore intégré (aucun client, aucune signature, aucun webhook)."
    );
  }
  if (provider !== "mock") {
    throw new PaymentConfigError(`PAYMENT_PROVIDER='${provider}' inconnu.`);
  }

  // --- mock sélectionné : contrôle strict multi-signaux (fail-closed) ---
  const blockers = [];
  const nodeEnv = String(env.NODE_ENV || "").trim().toLowerCase();
  const appEnv = String(env.APP_ENV || "").trim().toLowerCase();

  // (a) Interdictions ABSOLUES — tout signal de production refuse le mock,
  //     sans exception et quel que soit le nom de la base.
  if (["production", "prod"].includes(nodeEnv)) blockers.push("NODE_ENV=production");
  if (["production", "prod"].includes(appEnv)) blockers.push("APP_ENV=production");
  // Lot 4 (I4) : le contrôle /supabase/i sur DATABASE_URL a été RETIRÉ — la
  // décision d'autorisation ne dépend plus du fournisseur PostgreSQL (ni de
  // l'hôte, ni du nom de la base). Les blockers de production restent absolus.
  if (env.DATABASE_DRIVER !== "postgres") blockers.push("DATABASE_DRIVER != postgres");

  // (b) Signal POSITIF d'environnement non-productif EXIGÉ (fail-closed) :
  //     NODE_ENV ou APP_ENV doit déclarer explicitement development/dev/test/
  //     sandbox. Toute valeur absente, inconnue ou contradictoire est refusée —
  //     le nom de la base n'est JAMAIS le signal de sécurité (une production
  //     Neon nommée 'neondb' sans signal non-productif est donc refusée).
  const NON_PROD = new Set(["development", "dev", "test", "sandbox"]);
  if (!NON_PROD.has(nodeEnv) && !NON_PROD.has(appEnv)) {
    blockers.push(
      "aucun signal d'environnement non-productif (NODE_ENV ou APP_ENV doit explicitement valoir development/dev/test/sandbox)"
    );
  }

  // (b2) AUTORISATION EXPLICITE (Lot 2) — PAYMENT_MOCK_ACK, valeur UNIQUE :
  //      "MOCK-TEST-ONLY". Comparaison d'ÉGALITÉ STRICTE uniquement (jamais
  //      de sous-chaîne, de trim, ni de normalisation) — toute autre valeur,
  //      absence, chaîne vide ou texte supplémentaire = refus. Cette ACK
  //      n'autorise JAMAIS la production : les blockers (a) sont évalués avant
  //      et ne peuvent être compensés par aucune valeur d'ACK.
  if (env.PAYMENT_MOCK_ACK !== "MOCK-TEST-ONLY") {
    blockers.push(
      "PAYMENT_MOCK_ACK absent ou différent de MOCK-TEST-ONLY (autorisation explicite requise)"
    );
  }

  // (c) Signaux spécifiques au mock (jamais suffisants seuls).
  try {
    // Lot 4 (I4) : l'heuristique « nom de base 'postgres' » a été RETIRÉE ;
    // le contrôle de lisibilité de l'URL est CONSERVÉ (fail-closed).
    new URL(env.DATABASE_URL || "");
  } catch {
    blockers.push("DATABASE_URL illisible");
  }
  if (env.PAYMENT_MOCK_ENABLED !== "true") blockers.push("PAYMENT_MOCK_ENABLED != true");
  if (!MOCK_ENVS.has(env.PAYMENT_MOCK_ENV)) blockers.push("PAYMENT_MOCK_ENV absent ou invalide");

  if (blockers.length > 0) {
    throw new PaymentConfigError(
      "Mock de paiement REFUSÉ (fail-closed) : " + blockers.join(" ; ")
    );
  }
  return { active: "mock", mock: true, mode: env.PAYMENT_MOCK_ENV };
}

/** Vrai uniquement si le mock est légalement actif ; jamais d'exception. */
export function isMockActive(env = process.env) {
  try {
    return resolvePaymentProvider(env).mock === true;
  } catch {
    return false;
  }
}

/**
 * Avertissement (Lot 3) — configurations MIXTES : signal de production
 * (NODE_ENV/APP_ENV) combiné à une configuration de mock (PAYMENT_PROVIDER /
 * PAYMENT_MOCK_*). NE CHANGE JAMAIS LA DÉCISION (fail-closed conservé :
 * production + mock = REFUS) — journalisé au DÉMARRAGE uniquement
 * (assertPaymentConfig) pour éviter les logs répétitifs par requête.
 * Aucune valeur sensible imprimée (ni URL de base, ni identifiant, ni token,
 * ni objet de configuration) : seuls des noms de variables apparaissent.
 */
export function warnMixedPaymentConfig(env = process.env, log = console.warn) {
  const nodeEnv = String(env.NODE_ENV || "").trim().toLowerCase();
  const appEnv = String(env.APP_ENV || "").trim().toLowerCase();
  const prodSignal =
    ["production", "prod"].includes(nodeEnv) || ["production", "prod"].includes(appEnv);
  const mockSignal =
    String(env.PAYMENT_PROVIDER || "").trim().toLowerCase() === "mock" ||
    env.PAYMENT_MOCK_ENABLED === "true" ||
    env.PAYMENT_MOCK_ACK !== undefined ||
    env.PAYMENT_MOCK_ENV !== undefined;
  if (prodSignal && mockSignal) {
    log(
      "⚠️ [PAYMENT_CONFIG] Configuration mixte détectée : signal de production " +
        "(NODE_ENV/APP_ENV) avec une configuration de mock de paiement " +
        "(PAYMENT_PROVIDER/PAYMENT_MOCK_*). Le mock de paiement reste REFUSÉ — " +
        "aucun paiement simulé ne sera activé. Vérifiez les variables " +
        "d'environnement du déploiement."
    );
    return true;
  }
  return false;
}

/** Validation de démarrage : lève PaymentConfigError si la config est dangereuse. */
export function assertPaymentConfig(env = process.env) {
  warnMixedPaymentConfig(env); // avertissement au démarrage — jamais par requête
  return resolvePaymentProvider(env);
}
