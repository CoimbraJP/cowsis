import { db } from '@/db';
import { animals, animalTransactions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { DollarSign } from 'lucide-react';
import { updateTransactionAmount } from '../animals/actions';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  VACA: 'Vaca', BEZERRO: 'Bezerro', BEZERRA: 'Bezerra',
  TOURO: 'Touro', NOVILHA: 'Novilha', NOVILHO: 'Novilho',
};
const CATEGORY_COLORS: Record<string, string> = {
  VACA:    'bg-blue-500/10 text-blue-400',
  BEZERRO: 'bg-amber-500/10 text-amber-400',
  BEZERRA: 'bg-yellow-500/10 text-yellow-400',
  TOURO:   'bg-red-500/10 text-red-400',
  NOVILHA: 'bg-purple-500/10 text-purple-400',
  NOVILHO: 'bg-pink-500/10 text-pink-400',
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}
function fmtBRL(v: number | null) {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function parseTag(t: string | null): number {
  if (!t) return Infinity;
  const n = Number(t);
  return isNaN(n) ? Infinity : n;
}

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const sp = await searchParams;
  const sort = sp.sort || 'date_desc';

  const rawRows = await db
    .select({
      txId:      animalTransactions.id,
      animalId:  animalTransactions.animalId,
      date:      animalTransactions.transactionDate,
      notes:     animalTransactions.notes,
      amount:    animalTransactions.amount,
      tagNumber: animals.tagNumber,
      category:  animals.category,
    })
    .from(animalTransactions)
    .leftJoin(animals, eq(animalTransactions.animalId, animals.id))
    .where(eq(animalTransactions.type, 'SALE'))
    .orderBy(desc(animalTransactions.transactionDate), desc(animalTransactions.id));

  const rows = [...rawRows];
  switch (sort) {
    case 'date':
    case 'date_asc':  rows.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')); break;
    case 'date_desc': rows.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')); break;
    case 'tag':       rows.sort((a, b) => parseTag(a.tagNumber) - parseTag(b.tagNumber)); break;
    case 'tag_desc':  rows.sort((a, b) => parseTag(b.tagNumber) - parseTag(a.tagNumber)); break;
  }

  const total = rows.reduce((s, r) => s + (r.amount ?? 0), 0);

  function colHref(col: string) {
    return `/vendas?sort=${sort === col ? `${col}_desc` : col}`;
  }
  function arrow(col: string) {
    if (sort === col) return ' ↑';
    if (sort === `${col}_desc`) return ' ↓';
    return '';
  }

  const thClass = 'text-left px-4 py-3 font-medium hover:text-zinc-200 transition-colors cursor-pointer select-none';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          <DollarSign className="h-7 w-7 text-emerald-400" />
          Vendas
        </h2>
        <p className="text-zinc-400 mt-1">
          {rows.length} registro{rows.length !== 1 ? 's' : ''} no total
          {rows.length > 0 ? ` · ${fmtBRL(total)} em receita` : ''}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-12 text-center text-zinc-500">
          Nenhuma venda registrada.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                <th className={`${thClass} w-[12%]`}>
                  <Link href={colHref('date')}>Data{arrow('date')}</Link>
                </th>
                <th className="text-left px-4 py-3 font-medium w-[10%]">Tipo</th>
                <th className={`${thClass} w-[16%]`}>
                  <Link href={colHref('tag')}>Animal{arrow('tag')}</Link>
                </th>
                <th className="text-left px-4 py-3 font-medium">Descrição</th>
                <th className="text-right px-4 py-3 font-medium w-[22%]">Valor</th>
                <th className="px-4 py-3 w-[8%]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {rows.map((row) => (
                <tr key={row.txId} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 text-zinc-300 tabular-nums">{fmtDate(row.date)}</td>
                  <td className="px-4 py-3 text-zinc-400">💰 Venda</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-white">
                      {row.tagNumber ? `#${row.tagNumber}` : <span className="text-zinc-600 italic font-normal">sem brinco</span>}
                    </span>
                    {row.category && (
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_COLORS[row.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
                        {CATEGORY_LABELS[row.category] ?? row.category}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 truncate">
                    {row.notes || <span className="text-zinc-700">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <form action={async (fd: FormData) => {
                      'use server';
                      const raw = (fd.get('amount') as string)?.trim();
                      const val = raw ? Number(raw.replace(',', '.')) : null;
                      await updateTransactionAmount(row.txId, val !== null && !isNaN(val) ? val : null);
                    }} className="flex items-center justify-end gap-1.5">
                      <input type="number" name="amount" step="0.01" min="0" defaultValue={row.amount ?? ''} placeholder="0,00"
                        className="w-24 px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-white text-right focus:outline-none focus:border-emerald-500" />
                      <button type="submit"
                        className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded transition-colors font-medium whitespace-nowrap">
                        Salvar
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/animals/${row.animalId}?from=/vendas`}
                      className="text-xs text-white hover:text-emerald-400 transition-colors px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500">
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
