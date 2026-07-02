import { db } from "@/db";
import { animals, pastures, inseminations, pastureHistory } from "@/db/schema";
import { sql, eq, and, lte } from "drizzle-orm";
import { Activity, Beef, Sprout, Trees, Search, AlertTriangle, TrendingUp } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

function monthEnd(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset + 1);
  d.setDate(0);
  return d.toISOString().split('T')[0];
}

function monthLabel(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleDateString('pt-BR', { month: 'short' });
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const query = sp.q?.trim() || '';
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];

  let stats = { totalAnimals: 0, totalVacas: 0, totalBezerros: 0, activePastures: 0 };
  let searchResults: any[] = [];
  let topPastures: any[] = [];
  let overdueInseminations: any[] = [];
  let monthlyData: { label: string; count: number }[] = [];

  try {
    const [animalsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(animals)
      .where(eq(animals.status, 'ACTIVE'));
    const [vacasResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(animals)
      .where(and(eq(animals.status, 'ACTIVE'), eq(animals.category, 'VACA')));
    const [bezerrosResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(animals)
      .where(sql`status = 'ACTIVE' AND (category = 'BEZERRO' OR category = 'BEZERRA')`);
    const [pasturesResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(pastures)
      .where(eq(pastures.active, true));

    stats.totalAnimals   = Number(animalsResult?.count || 0);
    stats.totalVacas     = Number(vacasResult?.count || 0);
    stats.totalBezerros  = Number(bezerrosResult?.count || 0);
    stats.activePastures = Number(pasturesResult?.count || 0);

    topPastures = await db
      .select({
        id: pastures.id,
        name: pastures.name,
        animalCount: sql<number>`count(${animals.id})`,
      })
      .from(pastures)
      .leftJoin(animals, and(eq(pastures.id, animals.currentPastureId), eq(animals.status, 'ACTIVE')))
      .groupBy(pastures.id)
      .orderBy(sql`count(${animals.id}) desc`)
      .limit(5);

    overdueInseminations = await db
      .select({
        id: inseminations.id,
        inseminationDate: inseminations.inseminationDate,
        bullSemen: inseminations.bullSemen,
        animalId: inseminations.animalId,
        tagNumber: animals.tagNumber,
      })
      .from(inseminations)
      .leftJoin(animals, eq(inseminations.animalId, animals.id))
      .where(and(
        eq(inseminations.status, 'PENDING'),
        lte(inseminations.inseminationDate, sixtyDaysAgoStr),
      ))
      .limit(10);

    const history = await db
      .select({
        animalId: pastureHistory.animalId,
        enteredAt: pastureHistory.enteredAt,
        exitedAt: pastureHistory.exitedAt,
      })
      .from(pastureHistory);

    monthlyData = [-5, -4, -3, -2, -1, 0].map((offset) => {
      const asOf = monthEnd(offset);
      const count = new Set(
        history
          .filter(h => h.enteredAt <= asOf && (h.exitedAt === null || h.exitedAt > asOf))
          .map(h => h.animalId)
      ).size;
      return { label: monthLabel(offset), count };
    });

    if (query) {
      searchResults = await db
        .select({
          id: animals.id,
          tagNumber: animals.tagNumber,
          category: animals.category,
          status: animals.status,
          pastureName: pastures.name,
        })
        .from(animals)
        .leftJoin(pastures, eq(animals.currentPastureId, pastures.id))
        .where(sql`animals.tag_number ILIKE ${'%' + query + '%'}`)
        .limit(10);
    }
  } catch (error) {
    console.error("DB connection error on dashboard:", error);
  }

  const chartW = 480;
  const chartH = 140;
  const padL = 36;
  const padB = 28;
  const padT = 12;
  const innerW = chartW - padL - 16;
  const innerH = chartH - padT - padB;
  const barW = monthlyData.length > 0 ? innerW / monthlyData.length : 0;
  const maxCount = Math.max(...monthlyData.map(m => m.count), 1);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white">Dashboard</h2>
        <p className="text-zinc-400 mt-2">Visão geral do inventário da fazenda.</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/animals?status=ACTIVE" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col gap-2 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-400">Animais Ativos</h3>
            <Beef className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.totalAnimals}</div>
        </Link>
        <Link href="/animals?category=VACA&status=ACTIVE" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col gap-2 hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-400">Vacas</h3>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.totalVacas}</div>
        </Link>
        <Link href="/animals?status=ACTIVE" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col gap-2 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-400">Bezerros(as)</h3>
            <Sprout className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.totalBezerros}</div>
        </Link>
        <Link href="/pastures" className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col gap-2 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-400">Pastos Ativos</h3>
            <Trees className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white">{stats.activePastures}</div>
        </Link>
      </div>

      {/* Alerts */}
      {overdueInseminations.length > 0 && (
        <div className="rounded-xl border border-amber-900/40 bg-amber-900/10 p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <AlertTriangle size={18} />
            {overdueInseminations.length} inseminação(ões) aguardando resultado há mais de 60 dias
          </div>
          <div className="space-y-1">
            {overdueInseminations.map(ins => (
              <div key={ins.id} className="flex items-center gap-3 text-sm">
                <Link href={`/animals/${ins.animalId}`}
                  className="font-mono text-white hover:text-amber-400 transition-colors">
                  #{ins.tagNumber ?? ins.animalId}
                </Link>
                <span className="text-zinc-500">inseminada em {ins.inseminationDate}</span>
                {ins.bullSemen && <span className="text-zinc-600">• {ins.bullSemen}</span>}
              </div>
            ))}
          </div>
          <Link href="/inseminations?status=PENDING" className="text-xs text-amber-400 hover:underline">
            Ver todas as pendentes →
          </Link>
        </div>
      )}

      {/* Herd evolution chart */}
      {monthlyData.some(m => m.count > 0) && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            Evolução do Rebanho (últimos 6 meses)
          </h3>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full max-w-xl">
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const y = padT + innerH * (1 - pct);
              return (
                <g key={pct}>
                  <line x1={padL} y1={y} x2={chartW - 8} y2={y} stroke="#27272a" strokeWidth="1" />
                  <text x={padL - 4} y={y + 4} textAnchor="end" fill="#71717a" fontSize="9">
                    {Math.round(maxCount * pct)}
                  </text>
                </g>
              );
            })}
            {monthlyData.map((m, i) => {
              const barH = m.count > 0 ? (m.count / maxCount) * innerH : 0;
              const x = padL + i * barW + barW * 0.15;
              const w = barW * 0.7;
              const y = chartH - padB - barH;
              return (
                <g key={i}>
                  <rect x={x} y={y} width={w} height={barH} fill="#10b981" rx="3" opacity="0.85" />
                  {m.count > 0 && (
                    <text x={x + w / 2} y={y - 4} textAnchor="middle" fill="#d4d4d8" fontSize="10" fontWeight="600">
                      {m.count}
                    </text>
                  )}
                  <text x={x + w / 2} y={chartH - padB + 14} textAnchor="middle" fill="#71717a" fontSize="10">
                    {m.label}
                  </text>
                </g>
              );
            })}
            <line x1={padL} y1={chartH - padB} x2={chartW - 8} y2={chartH - padB} stroke="#3f3f46" strokeWidth="1" />
          </svg>
        </div>
      )}

      {/* Search */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Search className="h-5 w-5 text-emerald-400" />
          Buscar animal por brinco
        </h3>
        <form method="GET" className="flex gap-3">
          <input name="q" defaultValue={query} placeholder="Digite o número do brinco..."
            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500" />
          <button type="submit"
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors">
            Buscar
          </button>
        </form>
        {query && searchResults.length === 0 && (
          <p className="text-zinc-500 text-sm">Nenhum animal encontrado com brinco "{query}".</p>
        )}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((a) => (
              <Link key={a.id} href={`/animals/${a.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-white font-semibold">#{a.tagNumber}</span>
                  <span className="text-xs text-zinc-400 px-2 py-0.5 bg-zinc-700 rounded">{a.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  {a.pastureName && <span className="text-sm text-zinc-400">{a.pastureName}</span>}
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    a.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                    a.status === 'SOLD'   ? 'bg-zinc-500/10 text-zinc-400' :
                                            'bg-red-900/20 text-red-400'
                  }`}>
                    {a.status === 'ACTIVE' ? 'Ativo' : a.status === 'SOLD' ? 'Vendido' : 'Morto'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Top pastures */}
      {topPastures.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Trees className="h-5 w-5 text-emerald-400" />
            Pastos com mais animais
          </h3>
          <div className="space-y-2">
            {topPastures.map((p) => {
              const pct = stats.totalAnimals > 0
                ? Math.round((Number(p.animalCount) / stats.totalAnimals) * 100) : 0;
              return (
                <Link key={p.id} href={`/pastures/${p.id}`}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <span className="text-sm text-zinc-300 w-36 truncate">{p.name}</span>
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm text-zinc-400 w-12 text-right">{p.animalCount}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
