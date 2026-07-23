import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NavMenu } from "./nav-menu";
import Image from "next/image";

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
        <aside className="w-full md:w-60 shrink-0 bg-zinc-900 border-r border-zinc-800/60 flex flex-col md:min-h-screen">

          {/* Brand */}
          <div className="px-5 py-6 border-b border-zinc-800/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 shrink-0 rounded-lg overflow-hidden">
                <Image src="/logo.png" alt="Pecuária RS" width={36} height={36} className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight leading-none">Pecuária RS</h1>
                <p className="text-[10px] text-zinc-500 mt-0.5 leading-none">Gestão Inteligente</p>
              </div>
            </div>
          </div>

          <NavMenu />

          {/* Footer */}
          <div className="px-5 py-4 border-t border-zinc-800/60 mt-auto">
            <p className="text-[10px] text-zinc-700 leading-relaxed">
              Sistema de gestão de rebanho bovino
            </p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 md:p-10 overflow-auto min-w-0">
          {children}
        </main>

      </body>
    </html>
  );
}
