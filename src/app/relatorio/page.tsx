import { FileText } from 'lucide-react';
import { Toolbar, REPORT_TABS, type ReportKey } from './Toolbar';
import {
  getPastures, getRebanho, getMortes, getNascimentos, getVendas,
  getInseminacoes, getMovimentacoes, getAnimaisDoPasto, type Range,
} from './data';
import {
  GeralReport, MortesReport, NascimentosReport, VendasReport,
  InseminacoesReport, PastoReport,
} from './reports';
import { fmtDate } from './ui';

export const dynamic = 'force-dynamic';

/* ─────────────  Date helpers  ───────────── */

const iso = (d: Date) => d.toISOString().split('T')[0];
const today = () => iso(new Date());
function daysAgo(n: number)   { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); }
function monthsAgo(n: number) { const d = new Date(); d.setMonth(d.getMonth() - n); return iso(d); }
function startOfYear()        { return `${new Date().getFullYear()}-01-01`; }
function firstOfMonth()       { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }

const TITLES: Record<ReportKey, string> = {
  geral:        'Relatório Geral',
  mortes:       'Relatório de Mortes',
  nascimentos:  'Relatório de Nascimentos',
  vendas:       'Relatório de Vendas',
  inseminacoes: 'Relatório de Inseminações',
  pasto:        'Relatório por Pasto',
};

const SUBTITLES: Record<ReportKey, string> = {
  geral:        'Visão consolidada do rebanho, movimentações e resultado financeiro.',
  mortes:       'Ocorrências de morte, causas registradas e distribuição por categoria e pasto.',
  nascimentos:  'Nascimentos do período, sexo das crias e situação atual de cada animal.',
  vendas:       'Animais vendidos, receita gerada, ticket médio e desempenho por categoria.',
  inseminacoes: 'Registros de inseminação, taxa de prenhez e desempenho por touro/sêmen.',
  pasto:        'Inventário detalhado de cada pasto com animais, peso e inseminações.',
};

export default async function RelatorioPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; from?: string; to?: string; pastureId?: string }>;
}) {
  const sp = await searchParams;

  const tipo: ReportKey = (REPORT_TABS.find(t => t.key === sp.tipo)?.key ?? 'geral') as ReportKey;
  const from = sp.from || firstOfMonth();
  const to   = sp.to   || today();
  const pastureIdRaw = sp.pastureId ?? '';
  const pid = pastureIdRaw && !isNaN(Number(pastureIdRaw)) ? Number(pastureIdRaw) : null;
  const range: Range = { from, to, pid };

  const allPastures = await getPastures();
  const pastureNames: Record<number, string> = Object.fromEntries(allPastures.map(p => [p.id, p.name]));
  const selectedPasture = pid ? (pastureNames[pid] ?? `Pasto #${pid}`) : null;

  const generatedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  const presets = [
    { label: 'Este mês',  from: firstOfMonth(), to: today() },
    { label: '30 dias',   from: daysAgo(30),    to: today() },
    { label: '3 meses',   from: monthsAgo(3),   to: today() },
    { label: '6 meses',   from: monthsAgo(6),   to: today() },
    { label: '12 meses',  from: monthsAgo(12),  to: today() },
    { label: 'Este ano',  from: startOfYear(),  to: today() },
    { label: 'Tudo',      from: '2000-01-01',   to: today() },
  ];

  /* ── Fetch only what the selected report needs ── */
  let body: React.ReactNode = null;

  if (tipo === 'mortes') {
    const rows = await getMortes(range);
    body = <MortesReport rows={rows} pastureNames={pastureNames} from={from} to={to} />;
  } else if (tipo === 'nascimentos') {
    const rows = await getNascimentos(range);
    body = <NascimentosReport rows={rows} pastureNames={pastureNames} from={from} to={to} />;
  } else if (tipo === 'vendas') {
    const rows = await getVendas(range);
    body = <VendasReport rows={rows} pastureNames={pastureNames} from={from} to={to} />;
  } else if (tipo === 'inseminacoes') {
    const rows = await getInseminacoes(range);
    body = <InseminacoesReport rows={rows} pastureNames={pastureNames} from={from} to={to} />;
  } else if (tipo === 'pasto') {
    const [list, insems] = await Promise.all([
      getAnimaisDoPasto(pid),
      getInseminacoes({ from: '2000-01-01', to, pid }),
    ]);
    body = <PastoReport animals={list} insems={insems} pastureNames={pastureNames} />;
  } else {
    const [rebanho, movs] = await Promise.all([getRebanho(pid), getMovimentacoes(range)]);
    body = <GeralReport rebanho={rebanho} movs={movs} pastureNames={pastureNames} from={from} to={to} />;
  }

  return (
    <>
      <style>{PRINT_CSS}</style>

      <div className="report-root mx-auto max-w-6xl space-y-5">
        {/* Header */}
        <header className="report-header flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <FileText className="no-print h-6 w-6 shrink-0 text-emerald-400" />
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-white">
                {TITLES[tipo]}
              </h1>
            </div>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-500">
              {SUBTITLES[tipo]}
            </p>
          </div>
          <dl className="report-meta shrink-0 space-y-1 text-right text-xs">
            <div className="flex justify-end gap-2">
              <dt className="text-zinc-600">Período:</dt>
              <dd className="font-medium tabular-nums text-zinc-300">{fmtDate(from)} — {fmtDate(to)}</dd>
            </div>
            <div className="flex justify-end gap-2">
              <dt className="text-zinc-600">Pasto:</dt>
              <dd className="font-medium text-zinc-300">{selectedPasture ?? 'Todos'}</dd>
            </div>
            <div className="flex justify-end gap-2">
              <dt className="text-zinc-600">Emitido em:</dt>
              <dd className="tabular-nums text-zinc-400">{generatedAt}</dd>
            </div>
          </dl>
        </header>

        <Toolbar
          tipo={tipo}
          from={from}
          to={to}
          pastureId={pastureIdRaw}
          pastures={allPastures}
          presets={presets}
        />

        {body}

        <footer className="report-footer border-t border-zinc-800 pt-4 text-center text-[11px] text-zinc-600">
          Pecuária RS · {TITLES[tipo]} · {fmtDate(from)} a {fmtDate(to)}
          {selectedPasture ? ` · Pasto: ${selectedPasture}` : ''} · Emitido em {generatedAt}
        </footer>
      </div>
    </>
  );
}

/* ─────────────  Print stylesheet  ───────────── */

const PRINT_CSS = `
@media print {
  @page { size: A4 portrait; margin: 12mm 10mm; }

  aside, nav[class*="flex-1"], .no-print { display: none !important; }
  main { padding: 0 !important; margin: 0 !important; overflow: visible !important; }
  html, body {
    background: #fff !important;
    color: #111 !important;
    font-size: 9.5pt !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .report-root { max-width: none !important; }
  .report-root * { color: #222 !important; }

  h1, h2, h3 { color: #000 !important; }
  .report-header { border-color: #999 !important; }
  .report-header h1 { font-size: 16pt !important; }
  .report-meta { font-size: 8pt !important; }

  .report-card {
    background: #fff !important;
    border: 1px solid #cfcfcf !important;
    border-radius: 4px !important;
    break-inside: avoid;
    page-break-inside: avoid;
    margin-bottom: 8pt !important;
  }
  .report-card > header {
    background: #f6f6f6 !important;
    border-bottom: 1px solid #cfcfcf !important;
    padding: 5pt 8pt !important;
  }
  .report-card > header::before { display: none !important; }
  .report-card > header h3 { font-size: 11pt !important; font-weight: 700 !important; }
  .report-card > div { padding: 7pt 8pt !important; }

  .report-split { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 8pt !important; }

  .report-kpis { gap: 5pt !important; }
  .report-kpis > div {
    background: #fafafa !important;
    border: 1px solid #d8d8d8 !important;
    padding: 5pt 7pt !important;
    break-inside: avoid;
  }
  .report-kpis p:first-child { font-size: 6.5pt !important; color: #666 !important; }
  .report-kpis p:nth-child(2) { font-size: 14pt !important; color: #000 !important; margin-top: 3pt !important; }

  .report-table-wrap { margin: 0 !important; padding: 0 !important; overflow: visible !important; }
  .report-table { width: 100% !important; font-size: 8pt !important; }
  .report-table thead { display: table-header-group; }
  .report-table th {
    background: #eee !important;
    color: #000 !important;
    border-bottom: 1px solid #999 !important;
    padding: 3.5pt 4pt !important;
    font-size: 6.5pt !important;
  }
  .report-table td {
    border-bottom: 1px solid #e2e2e2 !important;
    padding: 3.5pt 4pt !important;
  }
  .report-table tr { break-inside: avoid; page-break-inside: avoid; }
  .report-table tfoot td { border-top: 1.5px solid #666 !important; font-weight: 700 !important; }

  .report-tag {
    background: transparent !important;
    border: 1px solid #bbb !important;
    box-shadow: none !important;
    color: #222 !important;
    padding: 0.5pt 3pt !important;
    font-size: 7pt !important;
  }

  .report-bar-track { background: #e8e8e8 !important; border: 1px solid #d0d0d0 !important; }
  .report-bar-fill  { background: #6b7280 !important; }

  .report-footer { border-color: #999 !important; color: #666 !important; font-size: 7.5pt !important; margin-top: 8pt !important; }
}
`;
