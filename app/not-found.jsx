"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Comportement historique : toute URL inconnue ramène à l'accueil.
 */
export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}
