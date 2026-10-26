import { Suspense } from "react";
import Payment from "@/components/Payment";

/**
 * Payment lit le plan via useSearchParams (?planId=...) :
 * Suspense requis par Next.js pour les composants clients qui
 * consomment les search params.
 */
export default function PaymentPage() {
  return (
    <Suspense fallback={null}>
      <Payment />
    </Suspense>
  );
}
