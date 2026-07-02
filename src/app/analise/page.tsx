import { db } from '@/db';
import { pastures, animals, pastureHistory, animalTransactions } from '@/db/schema';
import { eq, and, gte, lte, or, isNotNull, desc, sql } from 'drizzle-orm';
import Link from 'next/link';
import { CalendarDays, ArrowRightLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const dynamic = 'force-dynamic';

const CAT_COLOR: Record<string, string> = {
  VACA: 'text-blue-400', BEZERRO: 'text-amber-400', BEZERRA: 'text-yellow-400',
  TOURO: 'text-red-400', NOVILHA: 'text-purple-400', NOVILHO: 'text-pink-400',
  'BÚFALO': 'text-teal-400', 'BÚFALA': 'text-cyan-400',
};

function today() { return new Date().toISOString().split('T')[0]; }
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export default async function AnalisePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; pastureId?: string }>;
}) {
  const sp = await searchParams;
  const dateFrom   = sp.from      || daysAgo(30);
  const dateTo     = sp.to        || today();
  const pastureFilter = sp.pastureId ? Number(sp.pastureId) : null;

  const allPastures = await db.select().from(pastures).where(eq(pastures.active, true)).orderBy(pastures.name);
  const pastureMap  = Object.fromEntries(allPastures.map(p => [p.id, p.name]));

  // ── 1. All pasture_history events in range ──────────────────────────────────
  // An event is: an animal entered (enteredAt in range) OR exited (exitedAt in range)
  const histCond = and(
    pastureFilter ? eq(pastureHistory.pastureId, pastureFilter) : undefined,
    or(
      and(gte(pastureHistory.enteredAt, dateFrom), lte(pastureHistory.enteredAt, dateTo)),
      and(isNotNull(pastureHistory.exitedAt), gte(pastureHistory.exitedAt!, dateFrom), lte(pastureHistory.exitedAt!, dateTo)),
    )
  );

  const histRows = await db
    .select({
      id: pastureHistory.id,
      pastureId: pastureHistory.pastureId,
      enteredAt: pastureHistory.enteredAt,
      exitedAt:  pastureHistory.exitedAt,
      animalId:  animals.id,
      tagNumber: animals.tagNumber,
      category:  animals.category,
    })
    .from(pastureHistory)
    .innerJoin(animals, eq(pastureHistory.animalId, animals.id))
    .where(histCond)
    .orderBy(desc(pastureHistory.enteredAt));

  // ── 2. Build timeline: date → { entries, exits } ───────────────────────────
  type Event = {
    animalId: number;
    tagNumber: string | null;
    category: string;
    pastureId: number | null;
    pastureName: string;
    direction: 'ENTRY' | 'EXIT';
  };
  const timeline = new Map<string, Event[]>();

  for (const row of histRows) {
    // Entry event
    if (row.enteredAt >= dateFrom && row.enteredAt <= dateTo) {
      const key = row.enteredAt;
      if (!timeline.has(key)) timeline.set(key, []);
      timeline.get(key)!.push({
        animalId: row.animalId,
        tagNumber: row.tagNumber,
        category: row.category,
        pastureId: row.pastureId,
        pastureName: row.pastureId ? (pastureMap[row.pastureId] ?? `#${row.pastureId}`) : '—',
        direction: 'ENTRY',
      });
    }
    // Exit event
    if (row.exitedAt && row.exitedAt >= dateFrom && row.exitedAt <= dateTo) {
      const key = row.exitedAt;
      if (!timeline.has(key)) timeline.set(key, []);
      timeline.get(key)!.push({
        animalId: row.animalId,
        tagNumber: row.tagNumber,
        category: row.category,
        pastureId: row.pastureId,
        pastureName: row.pastureId ? (pastureMap[row.pastureId] ?? `#${row.pastureId}`) : '—',
        direction: 'EXIT',
      });
    }
  }

  // Sort dates descending
  const sortedDates = [...timeline.keys()].sort((a, b) => b.localeCompare(a));

  // ── 3. Per-pasture balance in period ────────────────────────────────────────
  const pastureBalance: Record<number, { name: string; entries: number; exits: number }> = {};
  for (const events of timeline.values()) {
    for (const e of events) {
      if (!e.pastureId) continue;
      if (!pastureBalance[e.pastureId]) pastureBalance[e.pastureId] = { name: e.pastureName, entries: 0, exits: 0 };
      if (e.direction === 'ENTRY') pastureBalance[e.pastureId].entries++;
      else pastureBalance[e.pastureId].exits++;
    }
  }

  // ── 4. Summary counts ────────────────────────────────────────────────────────
  let totalEntries = 0, totalExits = 0;
  for (const events of timeline.values()) {
    for (const e of events) {
      if (e.direction === 'ENTRY') totalEntries++;
      else totalExits++;
    }
  }
  const totalMovements = totalEntries + totalExits;

  // ── 5. Recent TRANSFER transactions for this period ──────────────────────────
  const recentTransfers = await db
    .select({
      id: animalTransactions.id,
      transactionDate: animalTransactions.transactionDate,
      fromPastureId: animalTransactions.fromPastureId,
      toPastureId:   animalTransactions.toPastureId,
      tagNumber:     animals.tagNumber,
      category:      animals.category,
      animalId:      animals.id,
    })
    .from(animalTransactions)
    .innerJoin(animals, eq(animalTransactions.animalId, animals.id))
    .where(and(
      eq(animalTransactions.type, 'TRANSFER'),
      gte(animalTransactions.transactionDate, dateFrom),
      lte(animalTransactions.transactionDate, dateTo),
      pastureFilter
        ? or(
            eq(animalTransactions.fromPastureId, pastureFilter),
            eq(animalTransactions.toPastureId, pastureFilter)
          )
        : undefined,
    ))
    .orderBy(desc(animalTransactions.transactionDate));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <CalendarDays className="h-8 w-8 text-emerald-400" />
          Análise por Data
        </h2>
        <p className="text-zinc-400 mt-1">
          Movimentações de animais entre pastos por período
        </p>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 items-end p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
        <div className="space-y-1">
          <label className="text-xs text-zinc-400 block">De</label>
          <input type="date" name="from" defaultValue={dateFrom}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-400 block">Até</label>
          <input type="date" name="to" defaultValue={dateTo}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-400 block">Pasto</label>
          <select name="pastureId" defaultValue={pastureFilter ?? ''}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500">
            <option value="">Todos os pastos</option>
            {allPastures.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <button type="submit"
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
          Filtrar
        </button>
        {/* Quick ranges */}
        <div className="flex gap-2 ml-2 flex-wrap">
          {[
            { label: '7d', from: daysAgo(7) },
            { label: '30d', from: daysAgo(30) },
            { label: '90d', from: daysAgo(90) },
          ].map(r => (
            <Link key={r.label}
              href={`/analise?from=${r.from}&to=${today()}${pastureFilter ? `&pastureId=${pastureFilter}` : ''}`}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                dateFrom === r.from && dateTo === today()
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}>
              {r.label}
            </Link>
          ))}
        </div>
      </form>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider flex items-center gap-1">
            <ArrowRightLeft size={12} /> Movimentos
          </p>
          <p className="text-3xl font-bold text-white mt-1">{totalMovements}</p>
          <p className="text-xs text-zinc-600 mt-1">{dateFrom} → {dateTo}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <TrendingUp size={12} /> Entradas
          </p>
          <p className="text-3xl font-bold text-white mt-1">{totalEntries}</p>
          <p className="text-xs text-zinc-600 mt-1">registros de entrada</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-red-400 uppercase tracking-wider flex items-center gap-1">
            <TrendingDown size={12} /> Saídas
          </p>
          <p className="text-3xl font-bold text-white mt-1">{totalExits}</p>
          <p className="text-xs text-zinc-600 mt-1">registros de saída</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <ArrowRightLeft size={12} /> Transferências
          </p>
          <p className="text-3xl font-bold text-white mt-1">{recentTransfers.length}</p>
          <p className="text-xs text-zinc-600 mt-1">no período</p>
        </div>
      </div>

      {/* Per-pasture balance */}
      {Object.keys(pastureBalance).length > 0 && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800">
            <h3 className="text-sm font-semibold text-white">Saldo por Pasto no Período</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/50 text-zinc-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left">Pasto</th>
                <th className="px-4 py-2 text-center text-emerald-400">Entradas</th>
                <th className="px-4 py-2 text-center text-red-400">Saídas</th>
                <th className="px-4 py-2 text-center">Saldo</th>
                <th className="px-4 py-2 text-right">Ver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {Object.entries(pastureBalance)
                .sort(([, a], [, b]) => Math.abs(b.entries - b.exits) - Math.abs(a.entries - a.exits))
                .map(([pid, bal]) => {
                  const net = bal.entries - bal.exits;
                  return (
                    <tr key={pid} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-2 text-white font-medium">{bal.name}</td>
                      <td className="px-4 py-2 text-center text-emerald-400 font-semibold">+{bal.entries}</td>
                      <td className="px-4 py-2 text-center text-red-400 font-semibold">-{bal.exits}</td>
                      <td className="px-4 py-2 text-center">
                        {net === 0
                          ? <span className="text-zinc-500 flex items-center justify-center gap-1"><Minus size={12} /> 0</span>
                          : <span className={`font-bold ${net > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {net > 0 ? `+${net}` : net}
                            </span>
                        }
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Link href={`/pastures/${pid}`}
                          className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors">
                          ver pasto →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Transfers detail table */}
      {recentTransfers.length > 0 && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800">
            <h3 className="text-sm font-semibold text-white">Transferências no Período ({recentTransfers.length})</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/50 text-zinc-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-left">Data</th>
                <th className="px-4 py-2 text-left">Animal</th>
                <th className="px-4 py-2 text-left">De</th>
                <th className="px-4 py-2 text-left">Para</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {recentTransfers.map(tx => (
                <tr key={tx.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-2 text-zinc-400 whitespace-nowrap">{tx.transactionDate ?? '—'}</td>
                  <td className="px-4 py-2">
                    <Link href={`/animals/${tx.animalId}`}
                      className="font-mono text-white hover:text-emerald-400 transition-colors">
                      {tx.tagNumber ? `#${tx.tagNumber}` : 'sem brinco'}
                    </Link>
                    <span className={`ml-2 text-xs ${CAT_COLOR[tx.category] ?? 'text-zinc-500'}`}>
                      {tx.category}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-zinc-400">
                    {tx.fromPastureId ? pastureMap[tx.fromPastureId] ?? `#${tx.fromPastureId}` : '—'}
                  </td>
                  <td className="px-4 py-2 text-emerald-400 font-medium">
                    {tx.toPastureId ? pastureMap[tx.toPastureId] ?? `#${tx.toPastureId}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Day-by-day timeline */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-white">
          Linha do Tempo ({sortedDates.length} {sortedDates.length === 1 ? 'dia' : 'dias'} com movimentação)
        </h3>

        {sortedDates.length === 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-500">
            Nenhuma movimentação registrada neste período.
            <p className="text-xs mt-2">Os dados aparecem conforme animais são transferidos entre pastos.</p>
          </div>
        )}

        {sortedDates.map(date => {
          const events = timeline.get(date)!;
          const entries = events.filter(e => e.direction === 'ENTRY');
          const exits   = events.filter(e => e.direction === 'EXIT');

          // Group by pasture
          const byPasture = new Map<string, { name: string; entries: Event[]; exits: Event[] }>();
          for (const e of events) {
            const key = String(e.pastureId ?? 'sem');
            if (!byPasture.has(key)) byPasture.set(key, { name: e.pastureName, entries: [], exits: [] });
            byPasture.get(key)![e.direction === 'ENTRY' ? 'entries' : 'exits'].push(e);
          }

          return (
            <div key={date} className="rounded-xl border border-zinc-800 overflow-hidden">
              {/* Date header */}
              <div className="flex items-center gap-4 px-4 py-3 bg-zinc-900 border-b border-zinc-800">
                <span className="font-semibold text-white">{date}</span>
                <span className="text-xs text-emerald-400">+{entries.length} entrada{entries.length !== 1 ? 's' : ''}</span>
                <span className="text-xs text-red-400">-{exits.length} saída{exits.length !== 1 ? 's' : ''}</span>
                <span className="text-xs text-zinc-600">{events.length} evento{events.length !== 1 ? 's' : ''} total</span>
              </div>

              {/* Per-pasture breakdown */}
              <div className="divide-y divide-zinc-800/50">
                {[...byPasture.entries()].map(([key, group]) => (
                  <div key={key} className="px-4 py-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-emerald-300">{group.name}</span>
                      {group.entries.length > 0 && (
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">
                          +{group.entries.length}
                        </span>
                      )}
                      {group.exits.length > 0 && (
                        <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded">
                          -{group.exits.length}
                        </span>
                      )}
                    </div>
                    {group.entries.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {group.entries.map(e => (
                          <Link key={`e-${e.animalId}`} href={`/animals/${e.animalId}`}
                            className={`text-xs px-2 py-0.5 rounded font-mono bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors ${CAT_COLOR[e.category] ?? 'text-zinc-400'}`}>
                            ↑ {e.tagNumber ?? 'S/B'}
                          </Link>
                        ))}
                      </div>
                    )}
                    {group.exits.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {group.exits.map(e => (
                          <Link key={`x-${e.animalId}`} href={`/animals/${e.animalId}`}
                            className={`text-xs px-2 py-0.5 rounded font-mono bg-red-500/10 hover:bg-red-500/20 transition-colors ${CAT_COLOR[e.category] ?? 'text-zinc-400'}`}>
                            ↓ {e.tagNumber ?? 'S/B'}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
