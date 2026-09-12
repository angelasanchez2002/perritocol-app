import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Perrito Col — Cuadre",
  description: "Cuadre administrativo de Perrito Col",
};

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/cuadre", label: "Cuadre diario" },
  { href: "/gastos", label: "Gastos" },
  { href: "/empleados", label: "Empleados" },
  { href: "/nomina", label: "Nómina" },
  { href: "/bodega", label: "Bodega" },
  { href: "/recetas", label: "Recetas" },
  { href: "/consumo", label: "Consumo" },
  { href: "/ganancia", label: "Ganancia" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <span className="font-semibold text-orange-600">🌭 Perrito Col</span>
            <nav className="flex gap-4 text-sm">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-neutral-600 hover:text-orange-600"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
