import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/AppProviders";
import "@/styles.css";

export const metadata: Metadata = {
  title: "GamerFolio",
  description:
    "A premium gaming identity, game library, and direct messaging frontend.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
