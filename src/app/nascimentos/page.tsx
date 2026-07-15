import { db } from '@/db';
import { animals, animalTransactions, pastures } from '@/db/schema';
import { eq, and, gte, inArray } from 'drizzle-orm';
import Link from 'next/link';
import { Baby } from 'lucide-react';

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

function parseTag(t: string | null): number {
  if (!t) return Infinity;
  const n = Number(t);
  return isNaN(n) ? Infinity : n;
}

export default async function NascimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; sort?: string }>;
}) {
  const sp   = await searchParams;
  const days = sp.days ? Number(sp.days) : 0;
  const sort = sp.sort || 'date_desc';

  let cutoffStr: string | null = null;
  if (days > 0) {
    const c = new Date();
    c.setDate(c.getDate() - days);
    cutoffStr = c.toISOString().split('T')[0];
  }

  const birthTxs = await db
    .select({
      txId:      animalTransactions.id,
      animalId:  animalTransactions.animalId,
      birthDate: animalTransactions.transactionDate,
      notes:     animalTransactions.notes,
    })
    .from(animalTransactions)
    .where(
      cutoffStr
        ? and(
            eq(animalTransactions.type, 'BIRTH'),
            gte(animalTransactions.transactionDate, cutoffStr),
          )
        : eq(animalTransactions.type, 'BIRTH'),
    );

  const animalIds = [...new Set(birthTxs.map(t => t.animalId))];

  const [animalRows, allPastures] = await Promise.all([
    animalIds.length > 0
      ? db
          .select({ id: animals.id, tagNumber: animals.tagNumber, category: animals.category, currentPastureId: animals.currentPastureId })
          .from(animals)
          .where(inArray(animals.id, animalIds))
      : Promise.resolve([]),
    db.select({ id: pastures.id, name: pastures.name }).from(pastures),
  ]);

  const pastureMap = Object.fromEntries(allPastures.map(p => [p.id, p.name]));
  const animalMap  = Object.fromEntries(animalRows.map(a => [a.id, a]));

  type Row = {
    txId:        number;
    animalId:    number;
    tagNumber:   string | null;
    category:    string;
    birthDate:   string;
    notes:       string | null;
    pastureId:   number | null;
    pastureName: string | null;
  };

  const rows: Row[] = birthTxs.map(tx => {
    const animal = animalMap[tx.animalId];
    return {
      txId:        tx.txId,
      animalId:    tx.animalId,
      tagNumber:   animal?.tagNumber ?? null,
      category:    animal?.category ?? '',
      birthDate:   tx.birthDate ?? '',
      notes:       tx.notes,
      pastureId:   animal?.currentPastureId ?? null,
      pastureName: animal?.currentPastureId ? (pastureMap[animal.currentPastureId] ?? null) : null,
    };
  });

  switch (sort) {
    case 'date_asc':     rows.sort((a, b) => a.birthDate.localeCompare(b.birthDate)); break;
    case 'date_desc':    rows.sort((a, b) => b.birthDate.localeCompare(a.birthDate)); break;
    case 'tag':          rows.sort((a, b) => parseTag(a.tagNumber) - parseTag(b.tagNumber)); break;
    case 'tag_desc':     rows.sort((a, b) => parseTag(b.tagNumber) - parseTag(a.tagNumber)); break;
    case 'pasture':      rows.sort((a, b) => (a.pastureName ?? '').localeCompare(b.pastureName ?? '')); break;
    case 'pasture_desc': rows.sort((a, b) => (b.pastureName ?? '').localeCompare(a.pastureName ?? '')); break;
    case 'category':     rows.sort((a, b) => a.category.localeCompare(b.category)); break;
    case 'category_desc':rows.sort((a, b) => b.category.localeCompare(a.category)); break;
  }

  function dayHref(d: number) {
    const p = new URLSearchParams();
    if (d > 0) p.set('days', String(d));
    if (sort !== 'date_desc') p.set('sort', sort);
    return `/nascimentos${p.toString() ? `?${p.toString()}` : ''}`;
  }

  function colHref(col: string) {
    const p = new URLSearchParams();
    if (days > 0) p.set('days', String(days));
    p.set('sort', sort === col ? `${col}_desc` : col);
    return `/nascimentos?${p.toString()}`;
  }

  function arrow(col: string) {
    if (sort === col) return ' ↑';
    if (sort === `${col}_desc`) return ' ↓';
    return '';
  }

  const dayBtnClass = (d: number) =>
    `px-3 py-1 rounded-full text-sm font-medium transition-colors ${
      days === d
        ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
    }`;

  const thClass = 'text-left px-4 py-3 font-medium hover:text-zinc-200 transition-colors cursor-pointer select-none';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Baby className="h-7 w-7 text-emerald-400" />
            Nascimentos
          </h2>
          <p className="text-zinc-400 mt-1">
            {rows.length} registro{rows.length !== 1 ? 's' : ''}
            {days > 0 ? ` nos últimos ${days} dias` : ' no total'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={dayHref(0)}  className={dayBtnClass(0)}>Todos</Link>
          <Link href={dayHref(30)} className={dayBtnClass(30)}>30 dias</Link>
          <Link href={dayHref(60)} className={dayBtnClass(60)}>60 dias</Link>
          <Link href={dayHref(90)} className={dayBtnClass(90)}>90 dias</Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-12 text-center text-zinc-500">
          Nenhum nascimento{days > 0 ? ` nos últimos ${days} dias` : ''} registrado.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wider">
                <th className={thClass}>
                  <Link href={colHref('tag')}>Brinco{arrow('tag')}</Link>
                </th>
                <th className={thClass}>
                  <Link href={colHref('category')}>Categoria{arrow('category')}</Link>
                </th>
                <th className={thClass}>
                  <Link href={colHref('date')}>Data de Nascimento{arrow('date')}</Link>
                </th>
                <th className={thClass}>
                  <Link href={colHref('pasture')}>Pasto Atual{arrow('pasture')}</Link>
                </th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500">Observações</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {rows.map((row) => (
                <tr key={row.txId} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-white">
                    {row.tagNumber ? `#${row.tagNumber}` : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {row.category ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[row.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
                        {CATEGORY_LABELS[row.category] ?? row.category}
                      </span>
                    ) : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-300 tabular-nums">
                    {row.birthDate
                      ? new Date(row.birthDate + 'T12:00:00').toLocaleDateString('pt-BR')
                      : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {row.pastureName && row.pastureId ? (
                      <Link href={`/pastures/${row.pastureId}`} className="hover:text-emerald-400 transition-colors">
                        {row.pastureName}
                      </Link>
                    ) : (
                      <span className="text-zinc-600">Sem pasto</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 max-w-[200px] truncate">
                    {row.notes || <span className="text-zinc-700">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/animals/${row.animalId}?from=/nascimentos`}
                      className="text-xs text-white hover:text-emerald-400 transition-colors px-2 py-1 rounded border border-zinc-700 hover:border-zinc-600">
                      Ver
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
