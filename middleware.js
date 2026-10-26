import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * Redirections des anciennes URLs React Router (avec majuscules) vers les
 * nouvelles routes App Router (en minuscules).
 *
 * IMPORTANT : les redirections de next.config.js matchent de façon
 * INSENSIBLE À LA CASSE — '/Home' redirigerait '/home' vers lui-même en
 * boucle infinie. On gère donc ces redirections ici, avec une
 * correspondance STRICTEMENT sensible à la casse (regex JS par défaut).
 */
const LEGACY_ROUTES = {
  "/Create": "/create",
  "/Models": "/models",
  "/Plan": "/plan",
  "/FAQ": "/faq",
  "/Terms": "/terms",
  "/Home": "/home",
  "/Plans": "/plans",
  "/Privacy": "/privacy",
  "/About": "/about",
  "/AdminPlans": "/admin/plans",
};

/**
 * Phase 3b — Authentification Edge.
 * Chemins protégés : /home, /plans, /payment, /admin/*.
 * Le JWT est lu dans le cookie httpOnly et sa SIGNATURE est vérifiée
 * (jose, HS256 — même secret que le backend, jamais exposé au client).
 * Une simple présence de cookie ne suffit PAS : signature + expiration exigées.
 *
 * Répartition des responsabilités :
 * - middleware = authentification (signature JWT valide ?) + confort de rôle ;
 * - backend = autorité finale (existence utilisateur en DB + adminOnly sur
 *   chaque endpoint admin) — un claim de rôle n'est jamais suffisant seul.
 */
const PROTECTED_PREFIXES = ["/home", "/plans", "/payment", "/admin"];

function isProtectedPath(pathname) {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

async function verifySession(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Fail-safe : sans secret, on ne peut rien valider → considéré non authentifié.
    console.error("JWT_SECRET manquant côté middleware Next.js.");
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
    return payload; // { id, role, iat, exp } — signature et expiration validées
  } catch {
    return null; // signature invalide, token expiré ou corrompu
  }
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // 1. Compatibilité : anciennes URLs (à la casse exacte près)
  // /Admin et /Admin/* → /admin et /admin/* (la suite du chemin est conservée)
  if (pathname === "/Admin" || pathname.startsWith("/Admin/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace(/^\/Admin/, "/admin");
    return NextResponse.redirect(url, 308);
  }

  const destination = Object.hasOwn(LEGACY_ROUTES, pathname)
    ? LEGACY_ROUTES[pathname]
    : null;
  if (destination) {
    const url = request.nextUrl.clone();
    url.pathname = destination;
    return NextResponse.redirect(url, 308);
  }

  // 2. Authentification des zones protégées
  if (isProtectedPath(pathname)) {
    const payload = await verifySession(request);

    if (!payload) {
      // Non connecté / JWT invalide → /login avec retour vers la page voulue
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = `?from=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }

    // Confort de rôle (l'autorité reste le backend : adminOnly côté API) :
    // un JWT valide sans rôle admin ne visite pas /admin.
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      if (String(payload.role).toLowerCase() !== "admin") {
        const url = request.nextUrl.clone();
        url.pathname = "/home";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  // Pas besoin d'intercepter les ressources statiques
  matcher: ["/((?!_next/static|_next/image|favicon\\.svg|.*\\..*).*)"],
};