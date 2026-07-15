import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "La Comanda — Carta digital",
  description: "Descubre nuestra carta con productos frescos y de calidad. Consulta precios, alérgenos y categorías.",
  openGraph: {
    title: "La Comanda — Carta digital",
    description: "Descubre nuestra carta con productos frescos y de calidad.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "La Comanda — Carta digital",
    description: "Descubre nuestra carta con productos frescos y de calidad.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0f0d0a; color: #efeae0; min-height: 100vh; }
        img { max-width: 100%; height: auto; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #3a3530; border-radius: 4px; }
      `}</style>
      <div
        style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: "#0f0d0a",
          color: "#efeae0",
          minHeight: "100vh",
        }}
      >
        {children}
      </div>
    </>
  );
}
