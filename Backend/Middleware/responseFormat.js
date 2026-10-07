/**
 * Normalise toutes les réponses JSON de l'API (convention CV.CRAFT) :
 *   - succès objet : { success: true, ...payload }
 *   - succès liste : { success: true, data: [...] }
 *   - erreur       : { success: false, message, code? } (statut HTTP >= 400)
 * Le drapeau "success" n'est jamais écrasé s'il est déjà présent.
 */
export const responseFormat = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    let normalized = body;

    if (Array.isArray(body)) {
      normalized = { success: res.statusCode < 400, data: body };
    } else if (body && typeof body === "object" && typeof body.success !== "boolean") {
      normalized = { success: res.statusCode < 400, ...body };
    }

    return originalJson(normalized);
  };

  next();
};
