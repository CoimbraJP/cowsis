import Link from 'next/link';
import { PrintButton } from './PrintButton';
import { ExcelButton } from './ExcelButton';

export const REPORT_TABS = [
  { key: 'geral',        label: 'Geral',         accent: 'emerald' },
  { key: 'mortes',       label: 'Mortes',        accent: 'red' },
  { key: 'nascimentos',  label: 'Nascimentos',   accent: 'green' },
  { key: 'vendas',       label: 'Vendas',        accent: 'blue' },
  { key: 'inseminacoes', label: 'Inseminações',  accent: 'purple' },
  { key: 'pasto',        label: 'Por Pasto',     accent: 'teal' },
] as const;

export type ReportKey = typeof REPORT_TABS[number]['key'];

const ACTIVE_CLS: Record<string, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  red:     'bg-red-500/15 text-red-300 ring-red-500/30',
  green:   'bg-green-500/15 text-green-300 ring-green-500/30',
  blue:    'bg-blue-500/15 text-blue-300 ring-blue-500/30',
  purple:  'bg-purple-500/15 text-purple-300 ring-purple-500/30',
  teal:    'bg-teal-500/15 text-teal-300 ring-teal-500/30',
};

function qs(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export function Toolbar({
  tipo, from, to, pastureId, pastures, presets,
}: {
  tipo: ReportKey;
  from: string;
  to: string;
  pastureId: string;
  pastures: { id: number; name: string; active: boolean }[];
  presets: { label: string; from: string; to: string }[];
}) {
  return (
    <div className="no-print space-y-3">
      {/* Tabs */}
      <nav className="flex flex-wrap gap-1.5 rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-1.5">
        {REPORT_TABS.map(t => {
          const active = t.key === tipo;
          return (
            <Link
              key={t.key}
              href={`/relatorio${qs({ tipo: t.key, from, to, pastureId })}`}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium ring-1 ring-inset transition-colors ${
                active
                  ? ACTIVE_CLS[t.accent]
                  : 'text-zinc-400 ring-transparent hover:bg-zinc-800/60 hover:text-zinc-100'
              }`}>
              {t.label}
            </Link>
          );
        })}
      </nav>

      {/* Filters */}
      <div className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 px-4 py-3.5">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="tipo" value={tipo} />
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">De</label>
            <input type="date" name="from" defaultValue={from}
              className="h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white outline-none focus:border-emerald-500" />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Até</label>
            <input type="date" name="to" defaultValue={to}
              className="h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white outline-none focus:border-emerald-500" />
          </div>
          <div className="min-w-[180px] flex-1 space-y-1">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Pasto</label>
            <select name="pastureId" defaultValue={pastureId}
              className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-white outline-none focus:border-emerald-500">
              <option value="">Todos os pastos</option>
              {pastures.map(p => (
                <option key={p.id} value={p.id}>{p.name}{p.active ? '' : ' (inativo)'}</option>
              ))}
            </select>
          </div>
          <button type="submit"
            className="h-9 rounded-lg bg-emerald-500 px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400">
            Aplicar
          </button>
          <div className="ml-auto flex items-end gap-2">
            <ExcelButton from={from} to={to} pastureId={pastureId} />
            <PrintButton />
          </div>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-zinc-800/70 pt-3">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-600">Período</span>
          {presets.map(p => {
            const active = p.from === from && p.to === to;
            return (
              <Link key={p.label}
                href={`/relatorio${qs({ tipo, from: p.from, to: p.to, pastureId })}`}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
                  active
                    ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
                    : 'text-zinc-400 ring-zinc-800 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`}>
                {p.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
