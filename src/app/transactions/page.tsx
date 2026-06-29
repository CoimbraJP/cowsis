import React from 'react';
import { db } from '@/db';
import { animalTransactions, animals, pastures } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { History } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  SALE:        { label: 'Venda',        color: 'bg-blue-500/10 text-blue-400',       icon: '💰' },
  DEATH:       { label: 'Morte',        color: 'bg-red-900/20 text-red-400',          icon: '💀' },
  BIRTH:       { label: 'Nascimento',   color: 'bg-emerald-500/10 text-emerald-400',  icon: '🐣' },
  ACQUISITION: { label: 'Aquisição',    color: 'bg-purple-500/10 text-purple-400',    icon: '📥' },
  TRANSFER:    { label: 'Transferência',color: 'bg-amber-500/10 text-amber-400',      icon: '🔄' },
  VACCINE:     { label: 'Vacina',       color: 'bg-cyan-500/10 text-cyan-400',        icon: '💉' },
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const typeFilter = sp.type || '';
  const monthFilter = sp.month || '';

  // Fetch all pastures for name lookup
  const allPastures = await db.select().from(pastures);
  const pastureNames = Object.fromEntries(allPastures.map(p => [p.id, p.name]));

  const txList = await db
    .select({
      id: animalTransactions.id,
      type: animalTransactions.type,
      transactionDate: animalTransactions.transactionDate,
      monthLabel: animalTransactions.monthLabel,
      notes: animalTransactions.notes,
      animalId: animalTransactions.animalId,
      fromPastureId: animalTransactions.fromPastureId,
      toPastureId: animalTransactions.toPastureId,
      tagNumber: animals.tagNumber,
      category: animals.category,
    })
    .from(animalTransactions)
    .leftJoin(animals, eq(animalTransactions.animalId, animals.id))
    .orderBy(desc(animalTransactions.id));

  const filtered = txList.filter((tx) => {
    if (typeFilter && tx.type !== typeFilter) return false;
    if (monthFilter && !(tx.monthLabel ?? '').toLowerCase().includes(monthFilter.toLowerCase())) return false;
    return true;
  });

  const counts = {
    SALE:        txList.filter(t => t.type === 'SALE').length,
    DEATH:       txList.filter(t => t.type === 'DEATH').length,
    BIRTH:       txList.filter(t => t.type === 'BIRTH').length,
    ACQUISITION: txList.filter(t => t.type === 'ACQUISITION').length,
    TRANSFER:    txList.filter(t => t.type === 'TRANSFER').length,
    VACCINE:     txList.filter(t => t.type === 'VACCINE').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <History className="h-8 w-8 text-emerald-400" />
          Movimentações
        </h2>
        <p className="text-zinc-400 mt-1">{filtered.length} registros</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(counts).map(([type, count]) => {
          const cfg = TYPE_CONFIG[type];
          return (
            <div key={type} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">{cfg.icon} {cfg.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <select
          name="type"
          defaultValue={typeFilter}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">Todos os tipos</option>
          <option value="SALE">Venda</option>
          <option value="DEATH">Morte</option>
          <option value="BIRTH">Nascimento</option>
          <option value="ACQUISITION">Aquisição</option>
          <option value="TRANSFER">Transferência</option>
          <option value="VACCINE">Vacina</option>
        </select>
        <input
          name="month"
          defaultValue={monthFilter}
          placeholder="Filtrar por mês (ex: Maio)"
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
        >
          Filtrar
        </button>
        {(typeFilter || monthFilter) && (
          <Link href="/transactions" className="px-4 py-2 text-zinc-400 hover:text-white rounded-lg transition-colors">
            Limpar
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Animal</th>
              <th className="px-4 py-3 text-left">Descrição</th>
              <th className="px-4 py-3 text-left">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-zinc-500">
                  Nenhuma movimentação encontrada.
                </td>
              </tr>
            )}
            {filtered.map((tx) => {
              const cfg = TYPE_CONFIG[tx.type] ?? { label: tx.type, color: 'bg-zinc-700 text-zinc-300', icon: '•' };

              // Build description based on type
              let description: React.ReactNode = tx.notes ?? '—';
              if (tx.type === 'TRANSFER') {
                const from = tx.fromPastureId ? pastureNames[tx.fromPastureId] ?? `Pasto #${tx.fromPastureId}` : '—';
                const to   = tx.toPastureId   ? pastureNames[tx.toPastureId]   ?? `Pasto #${tx.toPastureId}`   : '—';
                description = (
                  <span>
                    <span className="text-zinc-400">{from}</span>
                    <span className="text-zinc-600 mx-2">→</span>
                    <span className="text-emerald-400">{to}</span>
                  </span>
                );
              } else if (tx.type === 'VACCINE') {
                description = <span className="text-cyan-300">{tx.notes}</span>;
              }

              return (
                <tr key={tx.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-white">
                    {tx.tagNumber ? (
                      <Link href={`/animals/${tx.animalId}`} className="hover:text-emerald-400 transition-colors">
                        #{tx.tagNumber}
                      </Link>
                    ) : (
                      <span className="text-zinc-500 italic">sem brinco</span>
                    )}
                    {tx.category && (
                      <span className="text-zinc-500 font-sans font-normal text-xs ml-2">({tx.category})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 max-w-xs">{description}</td>
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{tx.transactionDate ?? tx.monthLabel ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
