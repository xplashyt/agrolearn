import type { Metadata } from "next";
import { Big_Shoulders_Display, Chivo, Courier_Prime } from "next/font/google";
import "./globals.css";

const display = Big_Shoulders_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Chivo({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgroLearn · Cursos para armar tu huerta en casa",
  description:
    "Cursos en video para sembrar tu comida en el patio, la terraza o el balcón. Desde 48.900 COP, pago único, acceso de por vida.",
  openGraph: {
    title: "AgroLearn · Cursos para armar tu huerta en casa",
    description:
      "Aprende a sembrar en materas, cajones o 2 m² de patio. Calendario para clima frío, templado y cálido.",
    locale: "es_CO",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO">
      <body
        className={`${display.variable} ${body.variable} ${mono.variable} bg-costal font-sans text-tinta antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
