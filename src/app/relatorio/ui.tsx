import React from 'react';

/* ─────────────────────────  Formatters  ───────────────────────── */

export function fmtDate(d?: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

export function fmtBRL(v?: number | null) {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function fmtNum(v?: number | null) {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR');
}

export const CATEGORY_LABELS: Record<string, string> = {
  VACA: 'Vaca', BEZERRO: 'Bezerro', BEZERRA: 'Bezerra', TOURO: 'Touro',
  NOVILHA: 'Novilha', NOVILHO: 'Novilho', 'BÚFALO': 'Búfalo', 'BÚFALA': 'Búfala',
};

export const CATEGORY_TONES: Record<string, string> = {
  VACA:     'bg-blue-500/10 text-blue-300 ring-blue-500/20',
  BEZERRO:  'bg-amber-500/10 text-amber-300 ring-amber-500/20',
  BEZERRA:  'bg-yellow-500/10 text-yellow-300 ring-yellow-500/20',
  TOURO:    'bg-red-500/10 text-red-300 ring-red-500/20',
  NOVILHA:  'bg-purple-500/10 text-purple-300 ring-purple-500/20',
  NOVILHO:  'bg-pink-500/10 text-pink-300 ring-pink-500/20',
};

export const INSEM_LABELS: Record<string, string> = {
  CONFIRMED: 'Prenha', FAILED: 'Não prenhou', PENDING: 'Aguardando',
};

export const TX_LABELS: Record<string, string> = {
  SALE: 'Venda', DEATH: 'Morte', BIRTH: 'Nascimento',
  ACQUISITION: 'Aquisição', TRANSFER: 'Transferência', VACCINE: 'Vacina',
};

/* ─────────────────────────  Primitives  ───────────────────────── */

export function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    neutral:  'bg-zinc-700/40 text-zinc-300 ring-zinc-600/40',
    emerald:  'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
    red:      'bg-red-500/10 text-red-300 ring-red-500/20',
    amber:    'bg-amber-500/10 text-amber-300 ring-amber-500/20',
    blue:     'bg-blue-500/10 text-blue-300 ring-blue-500/20',
    purple:   'bg-purple-500/10 text-purple-300 ring-purple-500/20',
    pink:     'bg-pink-500/10 text-pink-300 ring-pink-500/20',
  };
  return (
    <span className={`report-tag inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium leading-4 ring-1 ring-inset whitespace-nowrap ${tones[tone] ?? tones.neutral}`}>
      {children}
    </span>
  );
}

export function CategoryTag({ category }: { category: string }) {
  const cls = CATEGORY_TONES[category] ?? 'bg-zinc-700/40 text-zinc-300 ring-zinc-600/40';
  return (
    <span className={`report-tag inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium leading-4 ring-1 ring-inset whitespace-nowrap ${cls}`}>
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}

export function Tag_Number({ value }: { value: string | null }) {
  if (!value) return <span className="text-zinc-600 italic">sem brinco</span>;
  return <span className="font-mono font-medium text-white tabular-nums">#{value}</span>;
}

/* ─────────────────────────  Section card  ───────────────────────── */

export function Section({
  title,
  meta,
  right,
  children,
  accent = 'zinc',
}: {
  title: string;
  meta?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  accent?: 'zinc' | 'emerald' | 'red' | 'blue' | 'amber' | 'purple';
}) {
  const accents: Record<string, string> = {
    zinc:    'before:bg-zinc-600',
    emerald: 'before:bg-emerald-500',
    red:     'before:bg-red-500',
    blue:    'before:bg-blue-500',
    amber:   'before:bg-amber-500',
    purple:  'before:bg-purple-500',
  };
  return (
    <section className="report-card relative overflow-hidden rounded-xl border border-zinc-800/70 bg-zinc-900/40">
      <header className={`relative flex items-baseline justify-between gap-4 border-b border-zinc-800/70 px-5 py-3.5 before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] ${accents[accent]}`}>
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold leading-tight text-white">{title}</h3>
          {meta && <p className="mt-0.5 text-xs text-zinc-500">{meta}</p>}
        </div>
        {right && <div className="shrink-0 text-xs text-zinc-400">{right}</div>}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

/* ─────────────────────────  KPI row  ───────────────────────── */

export type KpiItem = {
  label: string;
  value: React.ReactNode;
  tone?: 'white' | 'emerald' | 'red' | 'amber' | 'blue' | 'purple' | 'pink' | 'zinc';
  hint?: string;
};

export function KpiRow({ items }: { items: KpiItem[] }) {
  const tones: Record<string, string> = {
    white:   'text-white',
    emerald: 'text-emerald-400',
    red:     'text-red-400',
    amber:   'text-amber-400',
    blue:    'text-blue-400',
    purple:  'text-purple-400',
    pink:    'text-pink-400',
    zinc:    'text-zinc-400',
  };
  const cols = items.length <= 3 ? items.length : items.length === 5 ? 5 : 4;
  const gridCls =
    cols === 2 ? 'sm:grid-cols-2' :
    cols === 3 ? 'sm:grid-cols-3' :
    cols === 5 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' :
                 'grid-cols-2 sm:grid-cols-4';
  return (
    <div className={`report-kpis grid gap-2.5 ${gridCls}`}>
      {items.map((k) => (
        <div key={k.label} className="rounded-lg border border-zinc-800/70 bg-zinc-950/40 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.1em] text-zinc-500">{k.label}</p>
          <p className={`mt-2 text-[26px] font-bold leading-none tabular-nums ${tones[k.tone ?? 'white']}`}>{k.value}</p>
          {k.hint && <p className="mt-1.5 text-[11px] leading-tight text-zinc-600">{k.hint}</p>}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────  Data table  ───────────────────────── */

export type Column = {
  label: string;
  width?: string;
  align?: 'left' | 'right' | 'center';
};

export function DataTable<T>({
  columns,
  rows,
  renderRow,
  empty = 'Nenhum registro no período selecionado.',
  footer,
}: {
  columns: Column[];
  rows: T[];
  renderRow: (row: T, index: number) => React.ReactNode[];
  empty?: string;
  footer?: React.ReactNode[];
}) {
  if (rows.length === 0) return <EmptyState message={empty} />;
  const alignCls = (a?: string) =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

  return (
    <div className="report-table-wrap -mx-5 overflow-x-auto px-5">
      <table className="report-table w-full table-fixed border-collapse text-sm">
        <colgroup>
          {columns.map((c, i) => <col key={i} style={c.width ? { width: c.width } : undefined} />)}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i}
                className={`border-b border-zinc-800 px-3 py-2 text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-zinc-500 ${alignCls(c.align)}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/30">
              {renderRow(row, i).map((cell, j) => (
                <td key={j} className={`px-3 py-2.5 align-middle ${alignCls(columns[j]?.align)}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot>
            <tr className="border-t-2 border-zinc-700">
              {footer.map((cell, j) => (
                <td key={j} className={`px-3 py-2.5 text-sm font-semibold text-white ${alignCls(columns[j]?.align)}`}>
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-800 px-4 py-10 text-center">
      <p className="text-sm text-zinc-600">{message}</p>
    </div>
  );
}

/* ─────────────────────────  Distribution bars  ───────────────────────── */

export function BarList({
  items,
  total,
  color = 'bg-emerald-500',
}: {
  items: { label: string; value: number }[];
  total: number;
  color?: string;
}) {
  if (items.length === 0) return <EmptyState message="Sem dados para exibir." />;
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <div className="space-y-2">
      {items.map((it) => {
        const pct = total > 0 ? Math.round((it.value / total) * 100) : 0;
        return (
          <div key={it.label} className="flex items-center gap-3 text-sm">
            <span className="w-36 shrink-0 truncate text-zinc-300">{it.label}</span>
            <div className="report-bar-track h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
              <div className={`report-bar-fill h-full rounded-full ${color}`}
                style={{ width: `${Math.round((it.value / max) * 100)}%` }} />
            </div>
            <span className="w-10 shrink-0 text-right tabular-nums text-zinc-200">{it.value}</span>
            <span className="w-10 shrink-0 text-right tabular-nums text-xs text-zinc-500">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
