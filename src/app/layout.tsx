import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { LayoutDashboard, Trees, Beef, History } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "COWSIS - Gestão de Gado",
  description: "Sistema inteligente de gestão de fazendas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-zinc-50 min-h-screen flex flex-col md:flex-row`}>
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col md:min-h-screen">
          <div className="p-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              COWSIS
            </h1>
            <p className="text-sm text-zinc-400 mt-1">Gestão Inteligente</p>
          </div>
          <nav className="flex-1 px-4 space-y-2">
            <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </Link>
            <Link href="/pastures" className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
              <Trees size={20} />
              <span>Pastos</span>
            </Link>
            <Link href="/animals" className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
              <Beef size={20} />
              <span>Animais</span>
            </Link>
            <Link href="/transactions" className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors">
              <History size={20} />
              <span>Movimentações</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-10 overflow-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
