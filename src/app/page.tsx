import { db } from "@/db";
import { animals, pastures, inseminations, pastureHistory, animalTransactions } from "@/db/schema";
import { sql, eq, and, desc } from "drizzle-orm";
import { Beef, Trees, Search, TrendingUp, ArrowRight, Syringe } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function monthEnd(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset + 1);
  d.setDate(0);
  return d.toISOString().split("T")[0];
}

function monthLabel(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleDateString("pt-BR", { month: "short" });
}

const STATUS_COLOR: Record<string, string> = {
  PENDING:   "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20",
  CONFIRMED: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
  FAILED:    "bg-zinc-500/10 text-zinc-400 ring-1 ring-zinc-500/20",
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: "Aguardando", CONFIRMED: "Prenha", FAILED: "Não prenhou",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const query = sp.q?.trim() || "";
  let stats = { totalAnimals: 0, activePastures: 0, vacas: 0, bezerros: 0, novilhos: 0, touros: 0 };
  let searchResults: any[] = [];
  let topPastures: any[] = [];
  let monthlyData: { label: string; count: number }[] = [];
  let recentInseminations: any[] = [];

  try {
    const [animalsResult] = await db.select({ count: sql<number>`count(*)` }).from(animals).where(eq(animals.status, "ACTIVE"));
    const [pasturesResult] = await db.select({ count: sql<number>`count(*)` }).from(pastures).where(eq(pastures.active, true));
    const categoryCounts = await db
      .select({ category: animals.category, count: sql<number>`count(*)` })
      .from(animals).where(eq(animals.status, "ACTIVE")).groupBy(animals.category);

    const catMap = Object.fromEntries(categoryCounts.map(r => [r.category, Number(r.count)]));
    stats.totalAnimals   = Number(animalsResult?.count || 0);
    stats.activePastures = Number(pasturesResult?.count || 0);
    stats.vacas    = catMap["VACA"] ?? 0;
    stats.bezerros = (catMap["BEZERRO"] ?? 0) + (catMap["BEZERRA"] ?? 0);
    stats.novilhos = (catMap["NOVILHO"] ?? 0) + (catMap["NOVILHA"] ?? 0);
    stats.touros   = catMap["TOURO"] ?? 0;

    topPastures = await db
      .select({ id: pastures.id, name: pastures.name, animalCount: sql<number>`count(${animals.id})` })
      .from(pastures)
      .leftJoin(animals, and(eq(pastures.id, animals.currentPastureId), eq(animals.status, "ACTIVE")))
      .groupBy(pastures.id)
      .orderBy(sql`count(${animals.id}) desc`)
      .limit(6);

    recentInseminations = await db
      .select({ id: inseminations.id, inseminationDate: inseminations.inseminationDate, status: inseminations.status, bullSemen: inseminations.bullSemen, animalId: inseminations.animalId, tagNumber: animals.tagNumber, category: animals.category })
      .from(inseminations)
      .leftJoin(animals, eq(inseminations.animalId, animals.id))
      .orderBy(desc(inseminations.inseminationDate), desc(inseminations.id))
      .limit(10);

    const history = await db.select({ animalId: pastureHistory.animalId, enteredAt: pastureHistory.enteredAt, exitedAt: pastureHistory.exitedAt }).from(pastureHistory);

    monthlyData = [-5, -4, -3, -2, -1, 0].map((offset) => {
      const asOf = monthEnd(offset);
      const count = new Set(history.filter(h => h.enteredAt <= asOf && (h.exitedAt === null || h.exitedAt > asOf)).map(h => h.animalId)).size;
      return { label: monthLabel(offset), count };
    });

    if (query) {
      searchResults = await db
        .select({ id: animals.id, tagNumber: animals.tagNumber, category: animals.category, status: animals.status, pastureName: pastures.name })
        .from(animals)
        .leftJoin(pastures, eq(animals.currentPastureId, pastures.id))
        .where(sql`animals.tag_number ILIKE ${"%" + query + "%"}`)
        .limit(10);
    }
  } catch (error) {
    console.error("DB connection error on dashboard:", error);
  }

  const chartW = 480; const chartH = 140; const padL = 36; const padB = 28; const padT = 12;
  const innerW = chartW - padL - 16; const innerH = chartH - padT - padB;
  const barW = monthlyData.length > 0 ? innerW / monthlyData.length : 0;
  const maxCount = Math.max(...monthlyData.map(m => m.count), 1);

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Dashboard</h2>
        <p className="text-sm text-zinc-500 mt-1">Visão geral do rebanho</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {[
          { href: "/animals?status=ACTIVE", label: "Animais Totais", value: stats.totalAnimals,   color: "text-emerald-400", border: "hover:border-emerald-500/30" },
          { href: "/animals?category=VACA",    label: "Vacas",          value: stats.vacas,          color: "text-blue-400",    border: "hover:border-blue-500/30" },
          { href: "/animals?category=BEZERRO", label: "Bezerros",       value: stats.bezerros,       color: "text-amber-400",   border: "hover:border-amber-500/30" },
          { href: "/animals?category=NOVILHO", label: "Novilhos",       value: stats.novilhos,       color: "text-pink-400",    border: "hover:border-pink-500/30" },
          { href: "/animals?category=TOURO",   label: "Touros",         value: stats.touros,         color: "text-red-400",     border: "hover:border-red-500/30" },
          { href: "/pastures",                 label: "Pastos Ativos",  value: stats.activePastures, color: "text-teal-400",    border: "hover:border-teal-500/30" },
        ].map(({ href, label, value, color, border }) => (
          <Link key={href} href={href} className={`group rounded-xl border border-zinc-800/60 bg-zinc-900/60 p-4 flex flex-col gap-2 ${border} hover:bg-zinc-900/80 transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]`}>
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest leading-tight">{label}</span>
            <span className={`text-3xl font-bold tabular-nums ${color}`}>{value}</span>
          </Link>
        ))}
      </div>

      {/* 1. Buscar */}
      <section className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-widest">Buscar</h3>
        </div>
        <form method="GET" className="flex gap-3">
          <input name="q" defaultValue={query} placeholder="Número do brinco..."
            className="flex-1 px-4 py-2.5 bg-zinc-800/80 border border-zinc-700/60 rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors" />
          <button type="submit" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-zinc-950 rounded-lg text-sm font-semibold transition-all duration-150">Buscar</button>
        </form>
        {query && searchResults.length === 0 && <p className="text-zinc-600 text-sm">Nenhum animal encontrado com brinco "{query}".</p>}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((a) => (
              <Link key={a.id} href={`/animals/${a.id}`} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/60 border border-zinc-700/40 hover:bg-zinc-800 hover:border-zinc-600/60 transition-all duration-150">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-white font-semibold text-sm">#{a.tagNumber}</span>
                  <span className="text-[11px] text-zinc-500 px-2 py-0.5 bg-zinc-700/60 rounded">{a.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  {a.pastureName && <span className="text-sm text-zinc-500">{a.pastureName}</span>}
                  <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${a.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" : a.status === "SOLD" ? "bg-zinc-500/10 text-zinc-400" : "bg-red-900/20 text-red-400"}`}>
                    {a.status === "ACTIVE" ? "Ativo" : a.status === "SOLD" ? "Vendido" : "Morto"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 2. Evolução */}
      {monthlyData.some(m => m.count > 0) && (
        <section className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-widest">Evolução do Rebanho</h3>
            <span className="ml-auto text-xs text-zinc-600">últimos 6 meses</span>
          </div>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full max-w-2xl">
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const y = padT + innerH * (1 - pct);
              return (<g key={pct}><line x1={padL} y1={y} x2={chartW - 8} y2={y} stroke="#27272a" strokeWidth="1" /><text x={padL - 4} y={y + 4} textAnchor="end" fill="#52525b" fontSize="9">{Math.round(maxCount * pct)}</text></g>);
            })}
            {monthlyData.map((m, i) => {
              const barH = m.count > 0 ? (m.count / maxCount) * innerH : 0;
              const x = padL + i * barW + barW * 0.18; const w = barW * 0.64; const y = chartH - padB - barH;
              return (<g key={i}><rect x={x} y={padT} width={w} height={innerH} fill="#18181b" rx="3" /><rect x={x} y={y} width={w} height={barH} fill="#10b981" rx="3" opacity="0.9" />{m.count > 0 && <text x={x + w / 2} y={y - 5} textAnchor="middle" fill="#a1a1aa" fontSize="10" fontWeight="600">{m.count}</text>}<text x={x + w / 2} y={chartH - padB + 14} textAnchor="middle" fill="#52525b" fontSize="10">{m.label}</text></g>);
            })}
            <line x1={padL} y1={chartH - padB} x2={chartW - 8} y2={chartH - padB} stroke="#3f3f46" strokeWidth="1" />
          </svg>
        </section>
      )}

      {/* 3. Pastos */}
      {topPastures.length > 0 && (
        <section className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6 space-y-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trees className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-widest">Pastos</h3>
            </div>
            <Link href="/pastures" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Ver todos <ArrowRight size={12} /></Link>
          </div>
          <div className="space-y-2.5">
            {topPastures.map((p) => {
              const pct = stats.totalAnimals > 0 ? Math.round((Number(p.animalCount) / stats.totalAnimals) * 100) : 0;
              return (
                <Link key={p.id} href={`/pastures/${p.id}`} className="flex items-center gap-3 group hover:opacity-80 transition-opacity">
                  <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors w-32 truncate shrink-0">{p.name}</span>
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                  <span className="text-sm text-zinc-500 tabular-nums w-6 text-right shrink-0">{p.animalCount}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Últimas 10 Inseminações — LAST */}
      <section className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-2">
            <Syringe className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-widest">Inseminações</h3>
            <span className="text-xs text-zinc-600">últimas 10</span>
          </div>
          <Link href="/inseminations" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Ver todas <ArrowRight size={12} /></Link>
        </div>
        {recentInseminations.length === 0 ? (
          <div className="px-6 py-10 text-center text-zinc-600 text-sm">Nenhuma inseminação registrada ainda.</div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {recentInseminations.map((ins) => (
              <Link key={ins.id} href={`/animals/${ins.animalId}`} className="flex items-center gap-4 px-6 py-3 hover:bg-zinc-800/30 transition-colors">
                <span className="text-xs text-zinc-600 tabular-nums w-20 shrink-0">{ins.inseminationDate ?? "—"}</span>
                <span className="font-mono text-white text-sm font-semibold w-20 shrink-0">{ins.tagNumber ? `#${ins.tagNumber}` : "—"}</span>
                <span className="text-xs text-zinc-600 w-16 shrink-0">{ins.category ?? ""}</span>
                <span className="text-xs text-zinc-500 flex-1 truncate">{ins.bullSemen ?? ""}</span>
                <span className={`shrink-0 px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_COLOR[ins.status ?? "PENDING"] ?? ""}`}>
                  {STATUS_LABEL[ins.status ?? "PENDING"] ?? ins.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
