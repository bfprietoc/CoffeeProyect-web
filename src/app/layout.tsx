import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Base para URLs absolutas de OG (metadataBase). En producción apunta a la
  // URL del tailnet; en dev, al build local.
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
  ),
  title: {
    default: "CoffeeProyect — Cafés de especialidad",
    template: "%s — CoffeeProyect",
  },
  description:
    "Cafés de especialidad colombianos: orígenes, procesos y notas de cata. Compra directo a finca.",
  openGraph: {
    siteName: "CoffeeProyect",
    locale: "es_CO",
    type: "website",
  },
  twitter: { card: "summary" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
