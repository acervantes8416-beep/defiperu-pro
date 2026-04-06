import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeFiPerú Pro — Plataforma de Trading Cripto",
  description: "Mini hedge fund automático para criptomonedas — Solo Spot, sin apalancamiento",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
