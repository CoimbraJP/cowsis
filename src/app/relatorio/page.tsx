import { db } from '@/db';
import { animals, pastures, inseminations, animalTransactions, pastureHistory } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  VACA: 'Vaca', BEZERRO: 'Bezerro', BEZERRA: 'Bezerra', TOURO: 'Touro',
  NOVILHA: 'Novilha', NOVILHO: 'Novilho', 'BÚFALO': 'Búfalo', 'BÚFALA': 'Búfala',
};

const TX_LABELS: Record<string, string> = {
  SALE: 'Venda', DEATH: 'Morte', BIRTH: 'Nascimento',
  ACQUISITION: 'Aquisição', TRANSFER: 'Transferência', VACCINE: 'Vacina',
};

function firstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function today() { return new Date().toISOString().split('T')[0]; }

function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export default async function RelatorioPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const dateFrom = sp.from || firstDayOfMonth();
  const dateTo   = sp.to   || today();
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const allPastures  = await db.select().from(pastures);
  const pastureNames = Object.fromEntries(allPastures.map(p => [p.id, p.name]));

  // 1. Rebanho atual por categoria
  const animalsByCat = await db
    .select({ category: animals.category, count: sql<number>`count(*)` })
    .from(animals)
    .where(eq(animals.status, 'ACTIVE'))
    .groupBy(animals.category)
    .orderBy(animals.category);

  const totalActive = animalsByCat.reduce((s, r) => s + Number(r.count), 0);

  // 2. Distribuição por pasto (ativos)
  const animalsByPasture = await db
    .select({
      pastureId: animals.currentPastureId,
      count: sql<number>`count(*)`,
    })
    .from(animals)
    .where(eq(animals.status, 'ACTIVE'))
    .groupBy(animals.currentPastureId);

  // 3. Transações no período
  const txRows = await db
    .select({
      id: animalTransactions.id,
      type: animalTransactions.type,
      transactionDate: animalTransactions.transactionDate,
      notes: animalTransactions.notes,
      amount: animalTransactions.amount,
      tagNumber: animals.tagNumber,
      category: animals.category,
      fromPastureId: animalTransactions.fromPastureId,
      toPastureId: animalTransactions.toPastureId,
    })
    .from(animalTransactions)
    .leftJoin(animals, eq(animalTransactions.animalId, animals.id))
    .where(and(
      gte(animalTransactions.transactionDate, dateFrom),
      lte(animalTransactions.transactionDate, dateTo),
    ))
    .orderBy(animalTransactions.transactionDate);

  const txByType: Record<string, typeof txRows> = {};
  for (const tx of txRows) {
    if (!txByType[tx.type]) txByType[tx.type] = [];
    txByType[tx.type].push(tx);
  }

  const totalReceita = txRows.filter(t => t.type === 'SALE' && t.amount).reduce((s, t) => s + (t.amount ?? 0), 0);
  const totalDespesa = txRows.filter(t => t.type !== 'SALE' && t.amount).reduce((s, t) => s + (t.amount ?? 0), 0);

  // 4. Inseminações no período
  const insemRows = await db
    .select({
      id: inseminations.id,
      inseminationDate: inseminations.inseminationDate,
      bullSemen: inseminations.bullSemen,
      status: inseminations.status,
      paid: inseminations.paid,
      tagNumber: animals.tagNumber,
    })
    .from(inseminations)
    .leftJoin(animals, eq(inseminations.animalId, animals.id))
    .where(and(
      gte(inseminations.inseminationDate, dateFrom),
      lte(inseminations.inseminationDate, dateTo),
    ))
    .orderBy(inseminations.inseminationDate);

  const nInsemPending   = insemRows.filter(r => r.status === 'PENDING').length;
  const nInsemConfirmed = insemRows.filter(r => r.status === 'CONFIRMED').length;
  const nInsemFailed    = insemRows.filter(r => r.status === 'FAILED').length;
  const nDecided        = nInsemConfirmed + nInsemFailed;
  const prenhez         = nDecided > 0 ? Math.round((nInsemConfirmed / nDecided) * 100) : null;

  // 5. Movimentações entre pastos no período (from pastureHistory)
  const movements = await db
    .select({
      animalId: pastureHistory.animalId,
      pastureId: pastureHistory.pastureId,
      enteredAt: pastureHistory.enteredAt,
      exitedAt: pastureHistory.exitedAt,
      tagNumber: animals.tagNumber,
    })
    .from(pastureHistory)
    .leftJoin(animals, eq(pastureHistory.animalId, animals.id))
    .where(and(
      gte(pastureHistory.enteredAt, dateFrom),
      lte(pastureHistory.enteredAt, dateTo),
    ))
    .orderBy(pastureHistory.enteredAt);

  return (
    <>
      <style>{`
        @media print {
          aside, .no-print { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          body { background: white !important; color: black !important; font-size: 11pt; }
          .print-page { background: white !important; }
          .print-card { border: 1px solid #ccc !important; background: white !important; break-inside: avoid; }
          .print-table th { background: #f4f4f5 !important; color: black !important; }
          .print-table td { color: black !important; }
          .print-header { border-bottom: 2px solid #10b981 !important; }
          h2, h3 { color: black !important; }
          .text-zinc-400, .text-zinc-500, .text-zinc-300 { color: #333 !important; }
          .text-white { color: black !important; }
          .text-emerald-400 { color: #059669 !important; }
          .text-red-400 { color: #dc2626 !important; }
        }
      `}</style>

      <div className="space-y-6 print-page">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4 print-header pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileText className="h-8 w-8 text-emerald-400 no-print" />
              Relatório Gerencial — COWSIS
            </h2>
            <p className="text-zinc-400 mt-1 text-sm">
              Período: {formatDate(dateFrom)} a {formatDate(dateTo)} · Gerado em {now}
            </p>
          </div>
          <div className="flex gap-3 items-center no-print">
            <form method="GET" className="flex items-end gap-2">
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block">De</label>
                <input type="date" name="from" defaultValue={dateFrom}
                  className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400 block">Até</label>
                <input type="date" name="to" defaultValue={dateTo}
                  className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <button type="submit"
                className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm transition-colors">
                Filtrar
              </button>
            </form>
            <PrintButton />
          </div>
        </div>

        {/* 1. Rebanho atual */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 print-card space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">
            1. Rebanho Atual
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {animalsByCat.map(r => (
              <div key={r.category} className="text-center p-3 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase">{CATEGORY_LABELS[r.category] ?? r.category}</p>
                <p className="text-2xl font-bold text-white mt-1">{r.count}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-zinc-400">
            <span className="font-semibold text-white">{totalActive}</span> animais ativos no total
          </p>

          {/* Por pasto */}
          {animalsByPasture.length > 0 && (
            <div>
              <p className="text-sm font-medium text-zinc-400 mb-2">Distribuição por pasto:</p>
              <div className="space-y-1">
                {animalsByPasture
                  .sort((a, b) => Number(b.count) - Number(a.count))
                  .map(r => (
                    <div key={String(r.pastureId)} className="flex items-center gap-2 text-sm">
                      <span className="text-zinc-300 w-40 truncate">
                        {r.pastureId ? (pastureNames[r.pastureId] ?? `Pasto #${r.pastureId}`) : 'Sem pasto'}
                      </span>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full"
                          style={{ width: totalActive > 0 ? `${Math.round((Number(r.count) / totalActive) * 100)}%` : '0%' }} />
                      </div>
                      <span className="text-zinc-400 w-8 text-right">{r.count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </section>

        {/* 2. Inseminações no período */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 print-card space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">
            2. Inseminações no Período
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-lg border border-zinc-800">
              <p className="text-xs text-zinc-500 uppercase">Total</p>
              <p className="text-2xl font-bold text-white">{insemRows.length}</p>
            </div>
            <div className="p-3 rounded-lg border border-zinc-800">
              <p className="text-xs text-amber-400 uppercase">Aguardando</p>
              <p className="text-2xl font-bold text-white">{nInsemPending}</p>
            </div>
            <div className="p-3 rounded-lg border border-zinc-800">
              <p className="text-xs text-emerald-400 uppercase">Prenhas</p>
              <p className="text-2xl font-bold text-white">{nInsemConfirmed}</p>
            </div>
            <div className="p-3 rounded-lg border border-zinc-800">
              <p className="text-xs text-purple-400 uppercase">Taxa Prenhez</p>
              <p className="text-2xl font-bold text-white">{prenhez !== null ? `${prenhez}%` : '—'}</p>
            </div>
          </div>

          {insemRows.length > 0 && (
            <table className="w-full text-sm print-table">
              <thead>
                <tr className="text-xs text-zinc-500 uppercase border-b border-zinc-800">
                  <th className="py-2 text-left">Data</th>
                  <th className="py-2 text-left">Animal</th>
                  <th className="py-2 text-left">Touro/Sêmen</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Pago</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {insemRows.map(r => (
                  <tr key={r.id}>
                    <td className="py-2 text-zinc-300">{r.inseminationDate}</td>
                    <td className="py-2 font-mono text-white">{r.tagNumber ? `#${r.tagNumber}` : '—'}</td>
                    <td className="py-2 text-zinc-400">{r.bullSemen ?? '—'}</td>
                    <td className="py-2">
                      <span className={
                        r.status === 'CONFIRMED' ? 'text-emerald-400' :
                        r.status === 'FAILED'    ? 'text-red-400' : 'text-amber-400'
                      }>
                        {r.status === 'CONFIRMED' ? 'Prenha' : r.status === 'FAILED' ? 'Vazia' : 'Aguardando'}
                      </span>
                    </td>
                    <td className="py-2 text-zinc-400">{r.paid ? 'Pago' : 'Pendente'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* 3. Movimentações / Transações no período */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 print-card space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">
            3. Movimentações no Período ({txRows.length} registros)
          </h3>

          {/* Summary by type */}
          <div className="flex flex-wrap gap-3">
            {Object.entries(txByType).map(([type, rows]) => (
              <div key={type} className="px-3 py-2 rounded-lg border border-zinc-800 text-sm">
                <span className="text-zinc-400">{TX_LABELS[type] ?? type}: </span>
                <span className="font-bold text-white">{rows.length}</span>
              </div>
            ))}
          </div>

          {/* Financial */}
          {(totalReceita > 0 || totalDespesa > 0) && (
            <div className="flex gap-4 text-sm">
              {totalReceita > 0 && (
                <div>
                  <span className="text-zinc-400">Receita (vendas): </span>
                  <span className="text-emerald-400 font-semibold">
                    {totalReceita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              )}
              {totalDespesa > 0 && (
                <div>
                  <span className="text-zinc-400">Despesas: </span>
                  <span className="text-red-400 font-semibold">
                    {totalDespesa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              )}
            </div>
          )}

          {txRows.length > 0 && (
            <table className="w-full text-sm print-table">
              <thead>
                <tr className="text-xs text-zinc-500 uppercase border-b border-zinc-800">
                  <th className="py-2 text-left">Data</th>
                  <th className="py-2 text-left">Tipo</th>
                  <th className="py-2 text-left">Animal</th>
                  <th className="py-2 text-left">Descrição</th>
                  <th className="py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {txRows.map(tx => {
                  let desc = tx.notes ?? '';
                  if (tx.type === 'TRANSFER') {
                    const from = tx.fromPastureId ? (pastureNames[tx.fromPastureId] ?? `#${tx.fromPastureId}`) : '—';
                    const to   = tx.toPastureId   ? (pastureNames[tx.toPastureId]   ?? `#${tx.toPastureId}`)   : '—';
                    desc = `${from} → ${to}`;
                  }
                  return (
                    <tr key={tx.id}>
                      <td className="py-2 text-zinc-300 whitespace-nowrap">{tx.transactionDate}</td>
                      <td className="py-2 text-zinc-400">{TX_LABELS[tx.type] ?? tx.type}</td>
                      <td className="py-2 font-mono text-white">{tx.tagNumber ? `#${tx.tagNumber}` : '—'}</td>
                      <td className="py-2 text-zinc-400 text-xs max-w-xs truncate">{desc || '—'}</td>
                      <td className="py-2 text-right">
                        {tx.amount ? (
                          <span className={tx.type === 'SALE' ? 'text-emerald-400' : 'text-red-400'}>
                            {tx.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {txRows.length === 0 && (
            <p className="text-zinc-500 text-sm">Nenhuma movimentação no período selecionado.</p>
          )}
        </section>

        {/* 4. Movimentações entre pastos no período */}
        {movements.length > 0 && (
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 print-card space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">
              4. Entradas em Pastos no Período ({movements.length} registros)
            </h3>
            <table className="w-full text-sm print-table">
              <thead>
                <tr className="text-xs text-zinc-500 uppercase border-b border-zinc-800">
                  <th className="py-2 text-left">Entrada</th>
                  <th className="py-2 text-left">Saída</th>
                  <th className="py-2 text-left">Animal</th>
                  <th className="py-2 text-left">Pasto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {movements.map(m => (
                  <tr key={m.animalId + '-' + m.enteredAt + '-' + m.pastureId}>
                    <td className="py-2 text-zinc-300">{m.enteredAt}</td>
                    <td className="py-2 text-zinc-400">{m.exitedAt ?? '(atual)'}</td>
                    <td className="py-2 font-mono text-white">{m.tagNumber ? `#${m.tagNumber}` : `id:${m.animalId}`}</td>
                    <td className="py-2 text-zinc-300">
                      {m.pastureId ? (pastureNames[m.pastureId] ?? `#${m.pastureId}`) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Footer */}
        <div className="text-xs text-zinc-600 text-center pb-4">
          COWSIS · Relatório gerado em {now} · Período: {formatDate(dateFrom)} a {formatDate(dateTo)}
        </div>
      </div>
    </>
  );
}
