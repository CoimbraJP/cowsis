import { db } from '@/db';
import { animals, pastures, inseminations, animalTransactions, pastureHistory } from '@/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { FileText } from 'lucide-react';
import Link from 'next/link';
import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  VACA: 'Vaca', BEZERRO: 'Bezerro', BEZERRA: 'Bezerra', TOURO: 'Touro',
  NOVILHA: 'Novilha', NOVILHO: 'Novilho',
};
const TX_LABELS: Record<string, string> = {
  SALE: 'Venda', DEATH: 'Morte', BIRTH: 'Nascimento',
  ACQUISITION: 'Aquisição', TRANSFER: 'Transferência', VACCINE: 'Vacina',
};
const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Prenha', FAILED: 'Não prenhou', PENDING: 'Aguardando',   // P25
};

function firstDayOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function today() { return new Date().toISOString().split('T')[0]; }
function nMonthsAgo(n: number) {
  const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().split('T')[0];
}
function nYearsAgo(n: number) {
  const d = new Date(); d.setFullYear(d.getFullYear() - n); return d.toISOString().split('T')[0];
}
function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export default async function RelatorioPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; pastureId?: string }>;
}) {
  const sp = await searchParams;
  const dateFrom   = sp.from     || firstDayOfMonth();
  const dateTo     = sp.to       || today();
  const pastureFilter = sp.pastureId || '';   // '' = geral, 'all' = todos pastos com animais, or numeric id
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const allPastures  = await db.select().from(pastures).orderBy(pastures.name);
  const pastureNames = Object.fromEntries(allPastures.map(p => [p.id, p.name]));

  // --- PASTO MODE: individual or all ---
  let pastureAnimals: Array<{
    id: number; tagNumber: string | null; category: string;
    weight: number | null; healthNotes: string | null;
    isPregnant: boolean | null; pastureName: string | null; pastureId: number | null;
  }> = [];
  let pastureInsems: Array<{
    id: number; inseminationDate: string | null; bullSemen: string | null;
    status: string | null; tagNumber: string | null; pastureId: number | null;
  }> = [];
  let selectedPastureName = '';

  if (pastureFilter === 'all') {
    selectedPastureName = 'Todos os Pastos';
    pastureAnimals = await db.select({
      id: animals.id, tagNumber: animals.tagNumber, category: animals.category,
      weight: animals.weight, healthNotes: animals.healthNotes,
      isPregnant: animals.isPregnant, pastureName: pastures.name,
      pastureId: animals.currentPastureId,
    }).from(animals)
      .leftJoin(pastures, eq(animals.currentPastureId, pastures.id))
      .where(eq(animals.status, 'ACTIVE'))
      .orderBy(pastures.name, animals.tagNumber);

    pastureInsems = await db.select({
      id: inseminations.id, inseminationDate: inseminations.inseminationDate,
      bullSemen: inseminations.bullSemen, status: inseminations.status,
      tagNumber: animals.tagNumber, pastureId: animals.currentPastureId,
    }).from(inseminations)
      .leftJoin(animals, eq(inseminations.animalId, animals.id))
      .orderBy(inseminations.inseminationDate);

  } else if (pastureFilter && !isNaN(Number(pastureFilter))) {
    const pid = Number(pastureFilter);
    selectedPastureName = pastureNames[pid] ?? `Pasto #${pid}`;
    pastureAnimals = await db.select({
      id: animals.id, tagNumber: animals.tagNumber, category: animals.category,
      weight: animals.weight, healthNotes: animals.healthNotes,
      isPregnant: animals.isPregnant, pastureName: pastures.name,
      pastureId: animals.currentPastureId,
    }).from(animals)
      .leftJoin(pastures, eq(animals.currentPastureId, pastures.id))
      .where(and(eq(animals.currentPastureId, pid), eq(animals.status, 'ACTIVE')))
      .orderBy(animals.tagNumber);

    const animalIds = pastureAnimals.map(a => a.id);
    if (animalIds.length > 0) {
      pastureInsems = await db.select({
        id: inseminations.id, inseminationDate: inseminations.inseminationDate,
        bullSemen: inseminations.bullSemen, status: inseminations.status,
        tagNumber: animals.tagNumber, pastureId: animals.currentPastureId,
      }).from(inseminations)
        .leftJoin(animals, eq(inseminations.animalId, animals.id))
        .where(eq(animals.currentPastureId, pid))
        .orderBy(inseminations.inseminationDate);
    }
  }

  // --- GENERAL STATS (filtered by pasto when specific pasto selected) ---
  // specificPid: the numeric pasto ID if one is selected, null otherwise
  const specificPid = (pastureFilter && pastureFilter !== 'all' && !isNaN(Number(pastureFilter)))
    ? Number(pastureFilter)
    : null;

  const animalsByCat = await db
    .select({ category: animals.category, count: sql<number>`count(*)` })
    .from(animals)
    .where(and(
      eq(animals.status, 'ACTIVE'),
      specificPid ? eq(animals.currentPastureId, specificPid) : undefined,
    ))
    .groupBy(animals.category).orderBy(animals.category);
  const totalActive = animalsByCat.reduce((s, r) => s + Number(r.count), 0);

  // Only show "by pasture" breakdown in general mode
  const animalsByPasture = specificPid ? [] : await db
    .select({ pastureId: animals.currentPastureId, count: sql<number>`count(*)` })
    .from(animals).where(eq(animals.status, 'ACTIVE'))
    .groupBy(animals.currentPastureId);

  const txRows = await db.select({
    id: animalTransactions.id, type: animalTransactions.type,
    transactionDate: animalTransactions.transactionDate,
    notes: animalTransactions.notes, amount: animalTransactions.amount,
    tagNumber: animals.tagNumber, category: animals.category,
    fromPastureId: animalTransactions.fromPastureId,
    toPastureId: animalTransactions.toPastureId,
  }).from(animalTransactions)
    .leftJoin(animals, eq(animalTransactions.animalId, animals.id))
    .where(and(
      gte(animalTransactions.transactionDate, dateFrom),
      lte(animalTransactions.transactionDate, dateTo),
      specificPid ? eq(animals.currentPastureId, specificPid) : undefined,
    ))
    .orderBy(animalTransactions.transactionDate);

  const txByType: Record<string, typeof txRows> = {};
  for (const tx of txRows) {
    if (!txByType[tx.type]) txByType[tx.type] = [];
    txByType[tx.type].push(tx);
  }

  const totalReceita = txRows.filter(t => t.type === 'SALE' && t.amount).reduce((s, t) => s + (t.amount ?? 0), 0);
  const totalDespesa = txRows.filter(t => t.type !== 'SALE' && t.amount).reduce((s, t) => s + (t.amount ?? 0), 0);

  const insemRows = await db.select({
    id: inseminations.id, inseminationDate: inseminations.inseminationDate,
    bullSemen: inseminations.bullSemen, status: inseminations.status,
    paid: inseminations.paid, tagNumber: animals.tagNumber,
  }).from(inseminations)
    .leftJoin(animals, eq(inseminations.animalId, animals.id))
    .where(and(
      gte(inseminations.inseminationDate, dateFrom),
      lte(inseminations.inseminationDate, dateTo),
      specificPid ? eq(animals.currentPastureId, specificPid) : undefined,
    ))
    .orderBy(inseminations.inseminationDate);

  const nInsemPending   = insemRows.filter(r => r.status === 'PENDING').length;
  const nInsemConfirmed = insemRows.filter(r => r.status === 'CONFIRMED').length;
  const nInsemFailed    = insemRows.filter(r => r.status === 'FAILED').length;
  const nDecided        = nInsemConfirmed + nInsemFailed;
  const prenhez         = nDecided > 0 ? Math.round((nInsemConfirmed / nDecided) * 100) : null;

  // Group pasto animals by pasture for 'all' mode
  const pastureGrouped: Record<string, typeof pastureAnimals> = {};
  if (pastureFilter === 'all') {
    for (const a of pastureAnimals) {
      const key = a.pastureName ?? 'Sem pasto';
      if (!pastureGrouped[key]) pastureGrouped[key] = [];
      pastureGrouped[key].push(a);
    }
  }

  return (
    <>
      <style>{`
        @media print {
          aside, .no-print { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          body { background: white !important; color: black !important; font-size: 11pt; }
          .print-page { background: white !important; }
          .print-card { border: 1px solid #ccc !important; background: white !important; break-inside: avoid; page-break-inside: avoid; margin-bottom: 16pt; }
          h2, h3 { color: black !important; }
          .text-zinc-400,.text-zinc-500,.text-zinc-300,.text-zinc-600 { color: #444 !important; }
          .text-white { color: black !important; }
          .text-emerald-400 { color: #059669 !important; }
          .text-red-400 { color: #dc2626 !important; }
          .text-amber-400 { color: #d97706 !important; }
          table th { background: #f4f4f5 !important; color: black !important; }
          table td { color: #333 !important; }
        }
        @keyframes btn-glow {
          0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.5);}
          50%{box-shadow:0 0 12px 4px rgba(34,197,94,0.35);}
        }
        .btn-pulse-green {
          background-color:#22c55e!important;
          color:#000!important;
          animation:btn-glow 0.9s ease-in-out infinite;
        }
      `}</style>

      <div className="space-y-6 print-page">
        {/* Header + Controls */}
        <div className="flex items-start justify-between flex-wrap gap-4 pb-4 border-b border-zinc-800">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileText className="h-8 w-8 text-emerald-400 no-print" />
              Relatório Gerencial — COWSIS
            </h2>
            <p className="text-zinc-400 mt-1 text-sm">
              Período: {formatDate(dateFrom)} a {formatDate(dateTo)}
              {selectedPastureName ? ` · Pasto: ${selectedPastureName}` : ''}
              {' · '}Gerado em {now}
            </p>
          </div>
          <div className="flex flex-col gap-3 no-print">
            <div className="flex gap-3 items-center flex-wrap">
              <form method="GET" className="flex items-end gap-2 flex-wrap">
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
                <div className="space-y-1">
                  <label className="text-xs text-zinc-400 block">Pasto</label>
                  <select name="pastureId" id="pastureIdSelect" defaultValue={pastureFilter}
                    className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500">
                    <option value="">Relatório geral</option>
                    <option value="all">Todos os pastos (com animais)</option>
                    {allPastures.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" id="applyBtn"
                  className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg text-sm transition-colors">
                  Aplicar
                </button>
              </form>
              <PrintButton />
            </div>
            {/* Quick period shortcuts */}
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-xs text-zinc-500">Período rápido:</span>
              {([
                { label: '3 meses', from: nMonthsAgo(3) },
                { label: '6 meses', from: nMonthsAgo(6) },
                { label: '1 ano',   from: nYearsAgo(1) },
              ] as { label: string; from: string }[]).map(({ label, from }) => (
                <Link key={label}
                  href={`/relatorio?from=${from}&to=${today()}${pastureFilter ? `&pastureId=${pastureFilter}` : ''}`}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    dateFrom === from && dateTo === today()
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white border-zinc-700'
                  }`}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* PASTO SECTION — shown when pastureId is set */}
        {pastureFilter && pastureAnimals.length > 0 && (
          <>
            {pastureFilter === 'all' ? (
              /* All pastures grouped */
              Object.entries(pastureGrouped).map(([pastName, pAnimals]) => {
                // P13: Match insems by pastureId (not tagNumber which can be null/duplicate)
                const pId = pAnimals[0]?.pastureId;
                const pInsems = pId != null ? pastureInsems.filter(i => i.pastureId === pId) : [];
                return (
                  <section key={pastName} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 print-card space-y-4">
                    <h3 className="text-lg font-semibold text-emerald-400 border-b border-zinc-800 pb-2">
                      🌿 {pastName} — {pAnimals.length} animais
                    </h3>
                    <PastureAnimalTable animals={pAnimals} insems={pInsems} />
                  </section>
                );
              })
            ) : (
              /* Single pasture */
              <section className="rounded-xl border border-emerald-900/30 bg-zinc-900/50 p-6 print-card space-y-4">
                <h3 className="text-lg font-semibold text-emerald-400 border-b border-zinc-800 pb-2">
                  🌿 Pasto: {selectedPastureName} — {pastureAnimals.length} animais
                </h3>
                {/* pastureInsems already filtered by currentPastureId in the query */}
                <PastureAnimalTable animals={pastureAnimals} insems={pastureInsems} />
              </section>
            )}
          </>
        )}

        {/* 1. Rebanho atual */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 print-card space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">
            Rebanho Atual
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {animalsByCat.map(r => (
              <div key={r.category} className="text-center p-3 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase">{CATEGORY_LABELS[r.category] ?? r.category}</p>
                <p className="text-2xl font-bold text-white mt-1 tabular-nums">{r.count}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-zinc-400">
            <span className="font-semibold text-white tabular-nums">{totalActive}</span> animais ativos no total
          </p>
          {animalsByPasture.length > 0 && (
            <div>
              <p className="text-sm font-medium text-zinc-400 mb-2">Por pasto:</p>
              <div className="space-y-1">
                {animalsByPasture.sort((a, b) => Number(b.count) - Number(a.count)).map(r => (
                  <div key={String(r.pastureId)} className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-300 w-40 truncate">
                      {r.pastureId ? (pastureNames[r.pastureId] ?? `Pasto #${r.pastureId}`) : 'Sem pasto'}
                    </span>
                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full"
                        style={{ width: totalActive > 0 ? `${Math.round((Number(r.count)/totalActive)*100)}%` : '0%' }} />
                    </div>
                    <span className="text-zinc-400 w-8 text-right tabular-nums">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 2. Inseminações no período */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 print-card space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">
            Inseminações no Período
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            {[
              { label: 'Total',     value: insemRows.length,  cls: 'text-white' },
              { label: 'Aguardando', value: nInsemPending,    cls: 'text-amber-400' },
              { label: 'Prenhas',   value: nInsemConfirmed,  cls: 'text-emerald-400' },
              { label: 'Taxa',      value: prenhez !== null ? `${prenhez}%` : '—', cls: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-lg border border-zinc-800">
                <p className="text-xs text-zinc-500 uppercase">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 tabular-nums ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>
          {insemRows.length > 0 && (
            <table className="w-full text-sm">
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
                    <td className="py-2 text-zinc-300 tabular-nums">{r.inseminationDate}</td>
                    <td className="py-2 font-mono text-white">{r.tagNumber ? `#${r.tagNumber}` : '—'}</td>
                    <td className="py-2 text-zinc-400">{r.bullSemen ?? '—'}</td>
                    <td className="py-2">
                      <span className={
                        r.status === 'CONFIRMED' ? 'text-emerald-400' :
                        r.status === 'FAILED' ? 'text-zinc-400' : 'text-amber-400'
                      }>
                        {STATUS_LABELS[r.status ?? 'PENDING'] ?? r.status}
                      </span>
                    </td>
                    <td className="py-2 text-zinc-400">{r.paid ? 'Pago' : 'Pendente'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* 3. Movimentações no período */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 print-card space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">
            Movimentações no Período ({txRows.length} registros)
          </h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(txByType).map(([type, rows]) => (
              <div key={type} className="px-3 py-2 rounded-lg border border-zinc-800 text-sm">
                <span className="text-zinc-400">{TX_LABELS[type] ?? type}: </span>
                <span className="font-bold text-white tabular-nums">{rows.length}</span>
              </div>
            ))}
          </div>
          {(totalReceita > 0 || totalDespesa > 0) && (
            <div className="flex gap-4 text-sm flex-wrap">
              {totalReceita > 0 && (
                <span>
                  <span className="text-zinc-400">Receita: </span>
                  <span className="text-emerald-400 font-semibold">
                    {totalReceita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </span>
              )}
              {totalDespesa > 0 && (
                <span>
                  <span className="text-zinc-400">Despesas: </span>
                  <span className="text-red-400 font-semibold">
                    {totalDespesa.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </span>
              )}
            </div>
          )}
          {txRows.length > 0 && (
            <table className="w-full text-sm">
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
                      <td className="py-2 text-zinc-300 whitespace-nowrap tabular-nums">{tx.transactionDate}</td>
                      <td className="py-2 text-zinc-400">{TX_LABELS[tx.type] ?? tx.type}</td>
                      <td className="py-2 font-mono text-white">{tx.tagNumber ? `#${tx.tagNumber}` : '—'}</td>
                      <td className="py-2 text-zinc-400 text-xs max-w-xs truncate">{desc || '—'}</td>
                      <td className="py-2 text-right tabular-nums">
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
            <p className="text-zinc-500 text-sm">Nenhuma movimentação no período.</p>
          )}
        </section>

        <div className="text-xs text-zinc-600 text-center pb-4">
          COWSIS · Relatório gerado em {now} · Período: {formatDate(dateFrom)} a {formatDate(dateTo)}
        </div>
      </div>
      {/* Pulse the Apply button when a pasture is selected */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          var s=document.getElementById('pastureIdSelect');
          var b=document.getElementById('applyBtn');
          if(!s||!b) return;
          s.addEventListener('change',function(){
            if(s.value){b.classList.add('btn-pulse-green');}
            else{b.classList.remove('btn-pulse-green');}
          });
        })();
      ` }} />
    </>
  );
}

// Sub-component: pasture animal table + insems
function PastureAnimalTable({
  animals: animalList,
  insems,
}: {
  animals: Array<{
    id: number; tagNumber: string | null; category: string;
    weight: number | null; healthNotes: string | null;
    isPregnant: boolean | null; pastureName: string | null; pastureId: number | null;
  }>;
  insems: Array<{
    id: number; inseminationDate: string | null; bullSemen: string | null;
    status: string | null; tagNumber: string | null; pastureId: number | null;
  }>;
}) {
  const STATUS_LABELS_LOCAL: Record<string, string> = {
    CONFIRMED: 'Prenha', FAILED: 'Não prenhou', PENDING: 'Aguardando',
  };
  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-zinc-500 uppercase border-b border-zinc-800">
            <th className="py-2 text-left">Brinco</th>
            <th className="py-2 text-left">Categoria</th>
            <th className="py-2 text-left">Peso (kg)</th>
            <th className="py-2 text-left">Prenha</th>
            <th className="py-2 text-left">Observações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {animalList.map(a => (
            <tr key={a.id}>
              <td className="py-2 font-mono text-white">{a.tagNumber ? `#${a.tagNumber}` : '—'}</td>
              <td className="py-2 text-zinc-400">{a.category}</td>
              <td className="py-2 text-zinc-300 tabular-nums">{a.weight ?? '—'}</td>
              <td className="py-2">
                {a.isPregnant ? <span className="text-pink-400">Sim</span> : <span className="text-zinc-600">—</span>}
              </td>
              <td className="py-2 text-zinc-500 text-xs">{a.healthNotes ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {insems.length > 0 && (
        <div>
          <p className="text-sm font-medium text-zinc-400 mb-2">Inseminações:</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 uppercase border-b border-zinc-800">
                <th className="py-1 text-left">Data</th>
                <th className="py-1 text-left">Animal</th>
                <th className="py-1 text-left">Touro/Sêmen</th>
                <th className="py-1 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {insems.map(r => (
                <tr key={r.id}>
                  <td className="py-1 text-zinc-400 tabular-nums">{r.inseminationDate}</td>
                  <td className="py-1 font-mono text-white">{r.tagNumber ? `#${r.tagNumber}` : '—'}</td>
                  <td className="py-1 text-zinc-400">{r.bullSemen ?? '—'}</td>
                  <td className="py-1">
                    <span className={
                      r.status === 'CONFIRMED' ? 'text-emerald-400' :
                      r.status === 'FAILED' ? 'text-zinc-400' : 'text-amber-400'
                    }>
                      {STATUS_LABELS_LOCAL[r.status ?? 'PENDING'] ?? r.status}
                    </span>
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
