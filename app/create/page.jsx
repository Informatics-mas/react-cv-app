"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

/**
 * react-to-print (useReactToPrint) est incompatible avec le rendu serveur :
 * la page Create est chargée en client-only (ssr: false), comme prévu au plan.
 * Suspense requis (convention payment/page.jsx) : Create lit le modèle choisi
 * via useSearchParams (?template=...).
 */
const Create = dynamic(() => import("@/components/Create"), {
  ssr: false,
  loading: () => <div className="min-h-full bg-[#0f172a]" />,
});

export default function CreatePage() {
  return (
    <Suspense fallback={<div className="min-h-full bg-[#0f172a]" />}>
      <Create />
    </Suspense>
  );
}
