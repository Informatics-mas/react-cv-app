import "./globals.css";
import Navbar from "@/components/Pages/Navbar";
import Footer from "@/components/Pages/Footer";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: "CV.CRAFT",
  description:
    "Créez un CV professionnel, moderne et optimisé pour les recruteurs.",
  icons: { icon: "/favicon.svg" },
};

/**
 * Layout racine (miroir de l'ancien App.jsx) :
 * architecture de scroll à viewport fixe — Navbar = slot fixe,
 * <main> = SEULE zone de scroll des pages, Footer en bas de <main>.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <AuthProvider>
          <div className="h-dvh flex flex-col overflow-hidden">
            <Navbar />
            <main className="flex-1 min-h-0 overflow-y-auto">
              {children}
              <Footer />
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
