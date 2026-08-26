import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--f-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--f-playfair", display: "swap" });

export const metadata: Metadata = {
  title: "Treinamentos Clientes — Pulso",
  description: "Gere apresentações de treinamento comercial para clientes em minutos.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
