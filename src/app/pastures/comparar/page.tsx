import { db } from '@/db';
import { pastures, animals, pastureHistory } from '@/db/schema';
import { eq, and, lte, or, isNull, sql } from 'drizzle-orm';
import Link from 'next/link';
import { GitCompare, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['VACA', 'BEZERRO', 'BEZERRA', 'TOURO', 'NOVILHA', 'NOVILHO', 'BÚFALO', 'BÚFALA'] as const;

const CAT_COLOR: Record<string, string> = {
  VACA: 'text-blue-400', BEZERRO: 'text-amber-400', BEZERRA: 'text-yellow-400',
  TOURO: 'text-red-400', NOVILHA: 'text-purple-400', NOVILHO: 'text-pink-400',
  'BÚFALO': 'text-teal-400', 'BÚFALA': 'text-cyan-400',
};

function lastDayOfMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).toISOString().split('T')[0];
}

function prevMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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

async function snapshotForMonth(month: string): Promise<Record<number, Record<string, number>>> {
  const asOf = lastDayOfMonth(month);
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

  const result: Record<number, Record<string, number>> = {};
  for (const row of rows) {
    if (!row.pastureId) continue;
    if (!result[row.pastureId]) result[row.pastureId] = {};
    result[row.pastureId][row.category] = Number(row.count);
  }
  return result;
}

// Also get brincos per pasture for current state
async function brincosByPasture(): Promise<Record<number, string[]>> {
  const rows = await db
    .select({ pastureId: animals.currentPastureId, tagNumber: animals.tagNumber })
    .from(animals)
    .where(eq(animals.status, 'ACTIVE'));

  const result: Record<number, string[]> = {};
  for (const r of rows) {
    if (!r.pastureId) continue;
    if (!result[r.pastureId]) result[r.pastureId] = [];
    result[r.pastureId].push(r.tagNumber ?? 'S/B');
  }
  return result;
}

export default async function PastureCompararPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; showBrincos?: string }>;
}) {
  const sp = await searchParams;
  const recentMonths = getRecentMonths(6);
  const selectedMonth = sp.month || recentMonths[0];
  const prev = prevMonth(selectedMonth);
  const showBrincos = sp.showBrincos === '1';

  const allPastures = await db.select().from(pastures).where(eq(pastures.active, true)).orderBy(pastures.name);
  const currentSnap = await snapshotForMonth(selectedMonth);
  const prevSnap    = await snapshotForMonth(prev);
  const brincos     = showBrincos ? await brincosByPasture() : {};

  // Determine used categories
  const usedCats = new Set<string>();
  [...Object.values(currentSnap), ...Object.values(prevSnap)].forEach(cats =>
    Object.keys(cats).forEach(c => usedCats.add(c))
  );
  const activeCats = CATEGORIES.filter(c => usedCats.has(c));

  // Detect drops: >20% decrease in total animals
  const drops: Array<{ pastureName: string; from: number; to: number; pct: number }> = [];
  for (const p of allPastures) {
    const prevTotal = activeCats.reduce((s, c) => s + (prevSnap[p.id]?.[c] ?? 0), 0);
    const currTotal = activeCats.reduce((s, c) => s + (currentSnap[p.id]?.[c] ?? 0), 0);
    if (prevTotal > 0 && currTotal < prevTotal) {
      const pct = Math.round(((prevTotal - currTotal) / prevTotal) * 100);
      if (pct >= 20) drops.push({ pastureName: p.name, from: prevTotal, to: currTotal, pct });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <GitCompare className="h-8 w-8 text-emerald-400" />
          Comparação entre Pastos
        </h2>
        <p className="text-zinc-400 mt-1">
          {selectedMonth} vs {prev} — variação por categoria
        </p>
      </div>

      {/* Month selector */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-zinc-400">Mês de referência:</span>
        {recentMonths.map(m => (
          <Link key={m}
            href={`/pastures/comparar?month=${m}${showBrincos ? '&showBrincos=1' : ''}`}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              selectedMonth === m ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}>
            {m}
          </Link>
        ))}
        <span className="ml-4 text-zinc-600">|</span>
        <Link
          href={`/pastures/comparar?month=${selectedMonth}&showBrincos=${showBrincos ? '0' : '1'}`}
          className="px-3 py-1 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
          {showBrincos ? 'Ocultar brincos' : 'Mostrar brincos'}
        </Link>
      </div>

      {/* Drops warning */}
      {drops.length > 0 && (
        <div className="rounded-xl border border-red-900/40 bg-red-900/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-400 font-semibold">
            <AlertTriangle size={18} />
            Quedas bruscas detectadas (≥20% em relação a {prev})
          </div>
          <div className="flex flex-wrap gap-3">
            {drops.map(d => (
              <div key={d.pastureName} className="bg-red-900/20 px-3 py-1.5 rounded-lg text-sm">
                <span className="text-white font-medium">{d.pastureName}</span>
                <span className="text-red-400 ml-2">{d.from} → {d.to} (−{d.pct}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison table */}
      <div className="rounded-xl border border-zinc-800 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left sticky left-0 bg-zinc-900">Pasto</th>
              {activeCats.map(c => (
                <th key={c} className={`px-3 py-3 text-center ${CAT_COLOR[c]}`} colSpan={2}>
                  {c}
                </th>
              ))}
              <th className="px-3 py-3 text-center text-zinc-400" colSpan={2}>Total</th>
            </tr>
            <tr className="text-xs">
              <th className="px-4 py-1 sticky left-0 bg-zinc-900" />
              {activeCats.flatMap(c => [
                <th key={`${c}-cur`} className="px-2 py-1 text-center text-zinc-500">{selectedMonth.slice(5)}</th>,
                <th key={`${c}-prev`} className="px-2 py-1 text-center text-zinc-600">{prev.slice(5)}</th>,
              ])}
              <th className="px-2 py-1 text-center text-zinc-500">{selectedMonth.slice(5)}</th>
              <th className="px-2 py-1 text-center text-zinc-600">{prev.slice(5)}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {allPastures.map((p, i) => {
              const cur  = currentSnap[p.id] ?? {};
              const prev_data = prevSnap[p.id] ?? {};
              const curTotal  = activeCats.reduce((s, c) => s + (cur[c] ?? 0), 0);
              const prevTotal = activeCats.reduce((s, c) => s + (prev_data[c] ?? 0), 0);
              const delta = curTotal - prevTotal;

              return (
                <tr key={p.id} className={`hover:bg-zinc-800/50 transition-colors ${i % 2 === 0 ? '' : 'bg-zinc-900/30'}`}>
                  <td className="px-4 py-2 sticky left-0 bg-inherit">
                    <Link href={`/pastures/${p.id}`} className="text-white font-medium hover:text-emerald-400 transition-colors">
                      {p.name}
                    </Link>
                    {showBrincos && brincos[p.id]?.length > 0 && (
                      <div className="text-xs text-zinc-500 mt-0.5 font-mono">
                        {brincos[p.id].sort().join(' · ')}
                      </div>
                    )}
                  </td>
                  {activeCats.flatMap(c => {
                    const cv = cur[c] ?? 0;
                    const pv = prev_data[c] ?? 0;
                    const d = cv - pv;
                    return [
                      <td key={`${c}-cur`} className={`px-2 py-2 text-center font-semibold ${cv > 0 ? CAT_COLOR[c] : 'text-zinc-700'}`}>
                        {cv || '—'}
                      </td>,
                      <td key={`${c}-prev`} className="px-2 py-2 text-center text-zinc-600">
                        {pv || '—'}
                        {d !== 0 && (
                          <span className={`ml-1 text-xs ${d > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {d > 0 ? `+${d}` : d}
                          </span>
                        )}
                      </td>,
                    ];
                  })}
                  <td className="px-2 py-2 text-center font-bold text-white">{curTotal || '—'}</td>
                  <td className="px-2 py-2 text-center text-zinc-600">
                    {prevTotal || '—'}
                    {delta !== 0 && curTotal > 0 && (
                      <span className={`ml-1 text-xs ${delta > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-600">
        Dados baseados no histórico de movimentação. Pastos sem registros de movimento ainda não aparecem nas colunas históricas — após a primeira movimentação começarão a ser rastreados.
      </p>
    </div>
  );
}
