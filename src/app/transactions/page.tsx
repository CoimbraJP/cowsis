import React from 'react';
import { db } from '@/db';
import { animalTransactions, animals, pastures } from '@/db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { History } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const TYPE_CONFIG: Record<string, { label: string; color: string; ring: string; icon: string }> = {
  SALE:        { label: 'Venda',         color: 'bg-blue-500/10 text-blue-400',      ring: 'border-blue-500/30',    icon: '💰' },
  DEATH:       { label: 'Morte',         color: 'bg-red-900/20 text-red-400',         ring: 'border-red-900/40',     icon: '💀' },
  BIRTH:       { label: 'Nascimento',    color: 'bg-emerald-500/10 text-emerald-400', ring: 'border-emerald-900/40', icon: '🐣' },
  ACQUISITION: { label: 'Aquisição',     color: 'bg-purple-500/10 text-purple-400',   ring: 'border-purple-900/40',  icon: '📥' },
  TRANSFER:    { label: 'Transferência', color: 'bg-amber-500/10 text-amber-400',     ring: 'border-amber-900/40',   icon: '🔄' },
  VACCINE:     { label: 'Vacina',        color: 'bg-cyan-500/10 text-cyan-400',       ring: 'border-cyan-900/40',    icon: '💉' },
};

function today() { return new Date().toISOString().split('T')[0]; }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const typeFilter = sp.type || '';
  const dateFrom   = sp.from || '';
  const dateTo     = sp.to   || '';

  const allPastures  = await db.select().from(pastures);
  const pastureNames = Object.fromEntries(allPastures.map(p => [p.id, p.name]));

  const conditions = [];
  if (typeFilter) conditions.push(eq(animalTransactions.type, typeFilter as any));
  if (dateFrom)   conditions.push(gte(animalTransactions.transactionDate, dateFrom));
  if (dateTo)     conditions.push(lte(animalTransactions.transactionDate, dateTo));

  const txList = await db
    .select({
      id:              animalTransactions.id,
      type:            animalTransactions.type,
      transactionDate: animalTransactions.transactionDate,
      notes:           animalTransactions.notes,
      amount:          animalTransactions.amount,
      animalId:        animalTransactions.animalId,
      fromPastureId:   animalTransactions.fromPastureId,
      toPastureId:     animalTransactions.toPastureId,
      tagNumber:       animals.tagNumber,
      category:        animals.category,
    })
    .from(animalTransactions)
    .leftJoin(animals, eq(animalTransactions.animalId, animals.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(animalTransactions.transactionDate), desc(animalTransactions.id));

  // P16: Counts should reflect the currently-filtered list, not all-time totals
  const counts: Record<string, number> = {};
  for (const tx of txList) {
    counts[tx.type] = (counts[tx.type] ?? 0) + 1;
  }

  const totalReceita = txList.filter(t => t.type === 'SALE' && t.amount).reduce((s, t) => s + (t.amount ?? 0), 0);
  const totalDespesa = txList.filter(t => t.type !== 'SALE' && t.amount).reduce((s, t) => s + (t.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <History className="h-8 w-8 text-emerald-400" />
          Movimentações
        </h2>
        <p className="text-zinc-400 mt-1">{txList.length} registros{(dateFrom || dateTo) ? ' no período' : ''}</p>
      </div>

      {/* Clickable summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
          const isActive = typeFilter === type;
          return (
            <Link key={type} href={isActive ? '/transactions' : `/transactions?type=${type}`}
              className={`rounded-xl border p-4 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                isActive
                  ? `${cfg.ring} ${cfg.color.replace('/10 ', '/20 ')} ring-1 ring-offset-0`
                  : `border-zinc-800 bg-zinc-900/50 hover:${cfg.ring}`
              }`}>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">{cfg.icon} {cfg.label}</p>
              <p className={`text-2xl font-bold mt-1 tabular-nums ${isActive ? cfg.color.split(' ')[1] : 'text-white'}`}>
                {counts[type] ?? 0}
              </p>
              {isActive && <p className="text-[10px] text-zinc-500 mt-1">clique para limpar</p>}
            </Link>
          );
        })}
      </div>

      {/* Financial summary */}
      {(totalReceita > 0 || totalDespesa > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-900/30 bg-emerald-900/10 p-4">
            <p className="text-xs text-emerald-400 uppercase tracking-wider">Receita (vendas)</p>
            <p className="text-2xl font-bold text-white mt-1 tabular-nums">
              {totalReceita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div className="rounded-xl border border-red-900/30 bg-red-900/10 p-4">
            <p className="text-xs text-red-400 uppercase tracking-wider">Despesas</p>
            <p className="text-2xl font-bold text-white mt-1 tabular-nums">
              {totalDespesa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
      )}

      {/* Date filters */}
      <form method="GET" className="flex flex-wrap gap-3 items-end p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
        {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
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
        <button type="submit"
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
          Filtrar período
        </button>
        <div className="flex gap-2">
          {[{ l: '7d', from: daysAgo(7) }, { l: '30d', from: daysAgo(30) }, { l: '90d', from: daysAgo(90) }].map(r => (
            <Link key={r.l}
              href={`/transactions?from=${r.from}&to=${today()}${typeFilter ? `&type=${typeFilter}` : ''}`}
              className="px-3 py-2 text-xs bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors">
              {r.l}
            </Link>
          ))}
          {(typeFilter || dateFrom || dateTo) && (
            <Link href="/transactions" className="px-3 py-2 text-xs text-zinc-500 hover:text-white rounded-lg transition-colors">
              Limpar filtros
            </Link>
          )}
        </div>
      </form>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Animal</th>
              <th className="px-4 py-3 text-left">Descrição</th>
              <th className="px-4 py-3 text-right">Valor R$</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {txList.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                  Nenhuma movimentação encontrada.
                </td>
              </tr>
            )}
            {txList.map((tx) => {
              const cfg = TYPE_CONFIG[tx.type] ?? { label: tx.type, color: 'text-zinc-400', ring: '', icon: '•' };
              let desc: React.ReactNode = tx.notes ?? '—';
              if (tx.type === 'TRANSFER') {
                const from = tx.fromPastureId ? (pastureNames[tx.fromPastureId] ?? `#${tx.fromPastureId}`) : '—';
                const to   = tx.toPastureId   ? (pastureNames[tx.toPastureId]   ?? `#${tx.toPastureId}`)   : '—';
                desc = (
                  <span>
                    <span className="text-zinc-400">{from}</span>
                    <span className="text-zinc-600 mx-2">→</span>
                    <span className="text-emerald-400">{to}</span>
                  </span>
                );
              } else if (tx.type === 'VACCINE') {
                desc = <span className="text-cyan-300">{tx.notes}</span>;
              }
              return (
                <tr key={tx.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap tabular-nums">{tx.transactionDate ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {tx.animalId ? (
                      <Link href={`/animals/${tx.animalId}`}
                        className="font-mono text-white hover:text-emerald-400 transition-colors">
                        {tx.tagNumber ? `#${tx.tagNumber}` : 'sem brinco'}
                      </Link>
                    ) : '—'}
                    {tx.category && <span className="ml-2 text-xs text-zinc-500">{tx.category}</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs max-w-xs">{desc}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {tx.amount != null && tx.amount > 0 ? (
                      <span className={tx.type === 'SALE' ? 'text-emerald-400 font-medium' : 'text-red-400'}>
                        {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
