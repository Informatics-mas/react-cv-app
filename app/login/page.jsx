import { Suspense } from "react";
import Login from "@/components/Pages/Login";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}
