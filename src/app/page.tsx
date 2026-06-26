import { db } from "@/db";
import { animals, pastures } from "@/db/schema";
import { sql, eq, and } from "drizzle-orm";
import { Activity, Beef, Sprout, Trees, Search } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const query = sp.q?.trim() || '';

  let stats = { totalAnimals: 0, totalVacas: 0, totalBezerros: 0, activePastures: 0 };
  let searchResults: any[] = [];
  let topPastures: any[] = [];

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

    stats.totalAnimals = Number(animalsResult?.count || 0);
    stats.totalVacas = Number(vacasResult?.count || 0);
    stats.totalBezerros = Number(bezerrosResult?.count || 0);
    stats.activePastures = Number(pasturesResult?.count || 0);

    // Pastures with most animals
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

    // Animal search
    if (query) {
      searchResults = await db
        .select({
          id: animals.id,
          tagNumber: animals.tagNumber,
          category: animals.category,
          status: animals.status,
          pastureName: pastures.name,
          pastureId: animals.currentPastureId,
        })
        .from(animals)
        .leftJoin(pastures, eq(animals.currentPastureId, pastures.id))
        .where(sql`animals.tag_number ILIKE ${'%' + query + '%'}`)
        .limit(10);
    }
  } catch (error) {
    console.error("DB connection error on dashboard:", error);
  }

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

      {/* Search */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Search className="h-5 w-5 text-emerald-400" />
          Buscar animal por brinco
        </h3>
        <form method="GET" className="flex gap-3">
          <input
            name="q"
            defaultValue={query}
            placeholder="Digite o número do brinco..."
            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
          >
            Buscar
          </button>
        </form>

        {query && searchResults.length === 0 && (
          <p className="text-zinc-500 text-sm">Nenhum animal encontrado com brinco "{query}".</p>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((a) => (
              <Link
                key={a.id}
                href={`/animals/${a.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-white font-semibold">#{a.tagNumber}</span>
                  <span className="text-xs text-zinc-400 px-2 py-0.5 bg-zinc-700 rounded">{a.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  {a.pastureName && <span className="text-sm text-zinc-400">{a.pastureName}</span>}
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    a.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                    a.status === 'SOLD' ? 'bg-zinc-500/10 text-zinc-400' :
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
              const pct = stats.totalAnimals > 0 ? Math.round((Number(p.animalCount) / stats.totalAnimals) * 100) : 0;
              return (
                <Link key={p.id} href={`/pastures/${p.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <span className="text-sm text-zinc-300 w-36 truncate">{p.name}</span>
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
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
