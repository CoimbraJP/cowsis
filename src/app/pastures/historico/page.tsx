import { db } from '@/db';
import { pastures, animals, pastureHistory } from '@/db/schema';
import { eq, and, lte, or, isNull, sql } from 'drizzle-orm';
import Link from 'next/link';
import { BarChart3 } from 'lucide-react';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['VACA', 'BEZERRO', 'BEZERRA', 'TOURO', 'NOVILHA', 'NOVILHO', 'BÚFALO', 'BÚFALA'] as const;

const CAT_SHORT: Record<string, string> = {
  VACA: 'Vaca', BEZERRO: 'Bzro', BEZERRA: 'Bzra', TOURO: 'Touro',
  NOVILHA: 'Novlha', NOVILHO: 'Novlho', 'BÚFALO': 'Búfalo', 'BÚFALA': 'Búfala',
};

const CAT_COLOR: Record<string, string> = {
  VACA: 'text-blue-400', BEZERRO: 'text-amber-400', BEZERRA: 'text-yellow-400',
  TOURO: 'text-red-400', NOVILHA: 'text-purple-400', NOVILHO: 'text-pink-400',
  'BÚFALO': 'text-teal-400', 'BÚFALA': 'text-cyan-400',
};

function lastDayOfMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).toISOString().split('T')[0];
}

function getRecentMonths(n = 6) {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

export default async function PastureHistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; months?: string }>;
}) {
  const sp = await searchParams;
  // Which month to highlight / show detail
  const selectedMonth = sp.month || getRecentMonths(1)[0];
  const monthCount = Math.min(Number(sp.months || 3), 6);

  const months = getRecentMonths(monthCount);
  const allPastures = await db.select().from(pastures).where(eq(pastures.active, true)).orderBy(pastures.name);

  // For each month, query how many animals (per category) were in each pasture
  // We compute "as of last day of month" from pastureHistory
  type MonthData = Record<number, Record<string, number>>; // pastureId -> category -> count
  const monthData: Record<string, MonthData> = {};

  for (const month of months) {
    const asOf = lastDayOfMonth(month);
    monthData[month] = {};

    const rows = await db
      .select({
        pastureId: pastureHistory.pastureId,
        category: animals.category,
        count: sql<number>`count(*)`,
      })
      .from(pastureHistory)
      .innerJoin(animals, eq(pastureHistory.animalId, animals.id))
      .where(
        and(
          lte(pastureHistory.enteredAt, asOf),
          or(isNull(pastureHistory.exitedAt), sql`${pastureHistory.exitedAt} > ${asOf}`)
        )
      )
      .groupBy(pastureHistory.pastureId, animals.category);

    for (const row of rows) {
      if (!row.pastureId) continue;
      if (!monthData[month][row.pastureId]) monthData[month][row.pastureId] = {};
      monthData[month][row.pastureId][row.category] = Number(row.count);
    }
  }

  // Determine which categories actually appear
  const usedCategories = new Set<string>();
  Object.values(monthData).forEach(md =>
    Object.values(md).forEach(cats =>
      Object.keys(cats).forEach(c => usedCategories.add(c))
    )
  );
  const activeCats = CATEGORIES.filter(c => usedCategories.has(c));

  // Check if there's any data at all
  const hasAnyData = Object.values(monthData).some(md =>
    Object.values(md).some(cats => Object.values(cats).some(v => v > 0))
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-emerald-400" />
          Histórico Mensal por Pasto
        </h2>
        <p className="text-zinc-400 mt-1">Composição do rebanho ao final de cada mês</p>
      </div>

      {/* Controls */}
      <form method="GET" className="flex flex-wrap gap-3 items-center">
        <span className="text-sm text-zinc-400">Meses exibidos:</span>
        {[1, 2, 3, 6].map(n => (
          <Link key={n} href={`/pastures/historico?months=${n}`}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${monthCount === n ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
            {n} {n === 1 ? 'mês' : 'meses'}
          </Link>
        ))}
      </form>

      {/* One table per month */}
      {months.map(month => {
        const md = monthData[month];
        const totals: Record<string, number> = {};
        let grandTotal = 0;
        for (const pasture of allPastures) {
          const cats = md[pasture.id] ?? {};
          for (const c of activeCats) {
            totals[c] = (totals[c] ?? 0) + (cats[c] ?? 0);
            grandTotal += (cats[c] ?? 0);
          }
        }

        return (
          <div key={month} className="space-y-2">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-white">{month}</h3>
              <span className="text-sm text-zinc-500">{grandTotal} animais total</span>
              <Link href={`/pastures/comparar?month=${month}`}
                className="text-xs text-emerald-400 hover:underline">
                comparar →
              </Link>
            </div>
            <div className="rounded-xl border border-zinc-800 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Pasto</th>
                    {activeCats.map(c => (
                      <th key={c} className={`px-3 py-3 text-center ${CAT_COLOR[c]}`}>{CAT_SHORT[c]}</th>
                    ))}
                    <th className="px-3 py-3 text-center text-zinc-400">Total</th>
                    <th className="px-3 py-3 text-center text-zinc-400">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {allPastures.map((p, i) => {
                    const cats = md[p.id] ?? {};
                    const rowTotal = activeCats.reduce((s, c) => s + (cats[c] ?? 0), 0);
                    if (rowTotal === 0) return null; // hide empty pastures
                    return (
                      <tr key={p.id} className={`hover:bg-zinc-800/50 transition-colors ${i % 2 === 0 ? '' : 'bg-zinc-900/30'}`}>
                        <td className="px-4 py-2 text-white font-medium">{p.name}</td>
                        {activeCats.map(c => (
                          <td key={c} className="px-3 py-2 text-center">
                            {cats[c] ? (
                              <span className={`font-semibold ${CAT_COLOR[c]}`}>{cats[c]}</span>
                            ) : (
                              <span className="text-zinc-700">—</span>
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center font-bold text-white">{rowTotal}</td>
                        <td className="px-3 py-2 text-center">
                          <Link href={`/pastures/${p.id}?period=${month}`}
                            className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors">
                            ver
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="bg-zinc-900 font-bold border-t-2 border-zinc-700">
                    <td className="px-4 py-2 text-zinc-300">TOTAL</td>
                    {activeCats.map(c => (
                      <td key={c} className={`px-3 py-2 text-center ${CAT_COLOR[c]}`}>
                        {totals[c] || '—'}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-white">{grandTotal}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {!hasAnyData && months.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-500">
          Nenhum dado histórico ainda. Os dados aparecem conforme os animais são movimentados entre pastos.
        </div>
      )}
    </div>
  );
}
