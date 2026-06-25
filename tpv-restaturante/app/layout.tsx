import type { Metadata, Viewport } from "next";
import { Inter, Bebas_Neue, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "../components/ErrorBoundary";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const TITLE = "La Comanda — TPV Restaurante";
const DESCRIPTION = "Sistema TPV profesional para bares y restaurantes. Gestión de mesas, cocina, inventario, pedidos a domicilio y más.";

export const viewport: Viewport = {
  themeColor: "#1a1d23",
};

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.svg",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "La Comanda",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "La Comanda",
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html
        lang="es"
        className={`${inter.variable} ${bebasNeue.variable} ${jetbrainsMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <ErrorBoundary>{children}</ErrorBoundary>
        </body>
      </html>
  );
}
