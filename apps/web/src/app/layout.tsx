
import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/AppProviders";
import { Footer } from "@/components/layout/Footer";
import "@/styles.css";

export const metadata: Metadata = {
  title: "GamerFolio",
  description:
    "A premium gaming identity, game library, and direct messaging frontend.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <div className="gf-app-shell">
            <main className="gf-app-content">{children}</main>
            <Footer />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
