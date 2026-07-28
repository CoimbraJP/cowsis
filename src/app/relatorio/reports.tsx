import React from 'react';
import {
  Section, KpiRow, DataTable, BarList, Tag, CategoryTag, Tag_Number,
  fmtDate, fmtBRL, CATEGORY_LABELS, INSEM_LABELS, TX_LABELS, EmptyState,
} from './ui';

type PMap = Record<number, string>;

const pName = (m: PMap, id: number | null | undefined) =>
  id ? (m[id] ?? `Pasto #${id}`) : '—';

function countBy<T>(rows: T[], key: (r: T) => string | null | undefined) {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = key(r);
    if (!k) continue;
    out[k] = (out[k] ?? 0) + 1;
  }
  return Object.entries(out)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function monthKey(d?: string | null) {
  if (!d) return null;
  const [y, m] = d.split('-');
  if (!y || !m) return null;
  return `${m}/${y}`;
}

function monthsInRange(from: string, to: string) {
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
  return Math.max(months, 1);
}

/* ══════════════════════════  MORTES  ══════════════════════════ */

export function MortesReport({ rows, pastureNames, from, to }: {
  rows: any[]; pastureNames: PMap; from: string; to: string;
}) {
  const byCat = countBy(rows, r => CATEGORY_LABELS[r.category] ?? r.category);
  const byPast = countBy(rows, r => r.pastureId ? pName(pastureNames, r.pastureId) : 'Sem pasto');
  const byMonth = countBy(rows, r => monthKey(r.date));
  const months = monthsInRange(from, to);
  const media = rows.length > 0 ? (rows.length / months).toFixed(1).replace('.', ',') : '0';

  return (
    <div className="space-y-4">
      <KpiRow items={[
        { label: 'Total de mortes', value: rows.length, tone: 'red' },
        { label: 'Média por mês',   value: media, tone: 'amber', hint: `${months} ${months === 1 ? 'mês' : 'meses'} no período` },
        { label: 'Categoria + afetada', value: byCat[0]?.label ?? '—', tone: 'white', hint: byCat[0] ? `${byCat[0].value} registro(s)` : undefined },
        { label: 'Pasto + afetado', value: byPast[0]?.label ?? '—', tone: 'white', hint: byPast[0] ? `${byPast[0].value} registro(s)` : undefined },
      ]} />

      {rows.length > 0 && (
        <div className="report-split grid gap-4 lg:grid-cols-2">
          <Section title="Por categoria" accent="red">
            <BarList items={byCat} total={rows.length} color="bg-red-500" />
          </Section>
          <Section title="Por pasto" accent="red">
            <BarList items={byPast} total={rows.length} color="bg-red-500/70" />
          </Section>
        </div>
      )}

      {byMonth.length > 1 && (
        <Section title="Evolução mensal" accent="red">
          <BarList items={byMonth.slice().reverse()} total={rows.length} color="bg-red-500/60" />
        </Section>
      )}

      <Section title="Registros de morte" meta={`${rows.length} ocorrência(s) entre ${fmtDate(from)} e ${fmtDate(to)}`} accent="red">
        <DataTable
          columns={[
            { label: 'Data',      width: '14%' },
            { label: 'Brinco',    width: '14%' },
            { label: 'Categoria', width: '14%' },
            { label: 'Pasto',     width: '20%' },
            { label: 'Causa / observação', width: '38%' },
          ]}
          rows={rows}
          empty="Nenhuma morte registrada no período."
          renderRow={(r) => [
            <span className="tabular-nums text-zinc-300">{fmtDate(r.date)}</span>,
            <Tag_Number value={r.tagNumber} />,
            r.category ? <CategoryTag category={r.category} /> : <span className="text-zinc-600">—</span>,
            <span className="truncate text-zinc-400">{pName(pastureNames, r.pastureId)}</span>,
            <span className="text-zinc-400">{r.notes || <span className="text-zinc-600 italic">não informado</span>}</span>,
          ]}
        />
      </Section>
    </div>
  );
}

/* ══════════════════════════  NASCIMENTOS  ══════════════════════════ */

export function NascimentosReport({ rows, pastureNames, from, to }: {
  rows: any[]; pastureNames: PMap; from: string; to: string;
}) {
  const machos  = rows.filter(r => r.category === 'BEZERRO' || r.category === 'NOVILHO').length;
  const femeas  = rows.filter(r => r.category === 'BEZERRA' || r.category === 'NOVILHA' || r.category === 'VACA').length;
  const vivos   = rows.filter(r => r.status === 'ACTIVE').length;
  const perdas  = rows.filter(r => r.status === 'DEAD').length;
  const byMonth = countBy(rows, r => monthKey(r.date));
  const byPast  = countBy(rows, r => r.pastureId ? pName(pastureNames, r.pastureId) : 'Sem pasto');
  const months  = monthsInRange(from, to);

  return (
    <div className="space-y-4">
      <KpiRow items={[
        { label: 'Total de nascimentos', value: rows.length, tone: 'emerald' },
        { label: 'Machos',  value: machos, tone: 'blue' },
        { label: 'Fêmeas',  value: femeas, tone: 'pink' },
        { label: 'Vivos hoje', value: vivos, tone: 'emerald', hint: perdas > 0 ? `${perdas} perda(s) posterior(es)` : undefined },
        { label: 'Média/mês', value: rows.length > 0 ? (rows.length / months).toFixed(1).replace('.', ',') : '0', tone: 'amber' },
      ]} />

      {rows.length > 0 && (
        <div className="report-split grid gap-4 lg:grid-cols-2">
          <Section title="Evolução mensal" accent="emerald">
            <BarList items={byMonth.slice().reverse()} total={rows.length} color="bg-emerald-500" />
          </Section>
          <Section title="Por pasto" accent="emerald">
            <BarList items={byPast} total={rows.length} color="bg-emerald-500/70" />
          </Section>
        </div>
      )}

      <Section title="Registros de nascimento" meta={`${rows.length} nascimento(s) entre ${fmtDate(from)} e ${fmtDate(to)}`} accent="emerald">
        <DataTable
          columns={[
            { label: 'Data',      width: '14%' },
            { label: 'Brinco',    width: '14%' },
            { label: 'Categoria', width: '14%' },
            { label: 'Pasto',     width: '18%' },
            { label: 'Situação',  width: '14%' },
            { label: 'Observação', width: '26%' },
          ]}
          rows={rows}
          empty="Nenhum nascimento registrado no período."
          renderRow={(r) => [
            <span className="tabular-nums text-zinc-300">{fmtDate(r.date)}</span>,
            <Tag_Number value={r.tagNumber} />,
            r.category ? <CategoryTag category={r.category} /> : <span className="text-zinc-600">—</span>,
            <span className="truncate text-zinc-400">{pName(pastureNames, r.pastureId)}</span>,
            r.status === 'ACTIVE' ? <Tag tone="emerald">Vivo</Tag>
              : r.status === 'DEAD' ? <Tag tone="red">Morto</Tag>
              : <Tag tone="neutral">Vendido</Tag>,
            <span className="text-zinc-400">{r.notes || <span className="text-zinc-600 italic">—</span>}</span>,
          ]}
        />
      </Section>
    </div>
  );
}

/* ══════════════════════════  VENDAS  ══════════════════════════ */

export function VendasReport({ rows, pastureNames, from, to }: {
  rows: any[]; pastureNames: PMap; from: string; to: string;
}) {
  const comValor = rows.filter(r => r.amount != null && r.amount > 0);
  const receita  = comValor.reduce((s, r) => s + (r.amount ?? 0), 0);
  const ticket   = comValor.length > 0 ? receita / comValor.length : 0;
  const maior    = comValor.reduce((m, r) => Math.max(m, r.amount ?? 0), 0);
  const byCat    = countBy(rows, r => CATEGORY_LABELS[r.category] ?? r.category);
  const byMonth  = countBy(rows, r => monthKey(r.date));

  const receitaPorCat: Record<string, number> = {};
  for (const r of rows) {
    const k = CATEGORY_LABELS[r.category] ?? r.category ?? '—';
    receitaPorCat[k] = (receitaPorCat[k] ?? 0) + (r.amount ?? 0);
  }

  return (
    <div className="space-y-4">
      <KpiRow items={[
        { label: 'Animais vendidos', value: rows.length, tone: 'white' },
        { label: 'Receita total',    value: fmtBRL(receita), tone: 'emerald' },
        { label: 'Ticket médio',     value: ticket > 0 ? fmtBRL(ticket) : '—', tone: 'blue', hint: `${comValor.length} venda(s) com valor` },
        { label: 'Maior venda',      value: maior > 0 ? fmtBRL(maior) : '—', tone: 'purple' },
      ]} />

      {rows.length > 0 && (
        <div className="report-split grid gap-4 lg:grid-cols-2">
          <Section title="Vendas por categoria" accent="blue">
            <BarList items={byCat} total={rows.length} color="bg-blue-500" />
          </Section>
          <Section title="Receita por categoria" accent="emerald">
            <div className="space-y-2">
              {Object.entries(receitaPorCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b border-zinc-800/50 py-1.5 text-sm last:border-0">
                  <span className="text-zinc-300">{k}</span>
                  <span className="font-medium tabular-nums text-emerald-400">{v > 0 ? fmtBRL(v) : '—'}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {byMonth.length > 1 && (
        <Section title="Evolução mensal" accent="blue">
          <BarList items={byMonth.slice().reverse()} total={rows.length} color="bg-blue-500/70" />
        </Section>
      )}

      <Section title="Registros de venda" meta={`${rows.length} venda(s) entre ${fmtDate(from)} e ${fmtDate(to)}`} accent="blue">
        <DataTable
          columns={[
            { label: 'Data',      width: '13%' },
            { label: 'Brinco',    width: '13%' },
            { label: 'Categoria', width: '13%' },
            { label: 'Pasto de origem', width: '18%' },
            { label: 'Comprador / observação', width: '27%' },
            { label: 'Valor',     width: '16%', align: 'right' },
          ]}
          rows={rows}
          empty="Nenhuma venda registrada no período."
          footer={rows.length > 0 ? ['Total', '', '', '', `${rows.length} animal(is)`, fmtBRL(receita)] : undefined}
          renderRow={(r) => [
            <span className="tabular-nums text-zinc-300">{fmtDate(r.date)}</span>,
            <Tag_Number value={r.tagNumber} />,
            r.category ? <CategoryTag category={r.category} /> : <span className="text-zinc-600">—</span>,
            <span className="truncate text-zinc-400">{pName(pastureNames, r.pastureId)}</span>,
            <span className="text-zinc-400">{r.notes || <span className="text-zinc-600 italic">—</span>}</span>,
            r.amount ? <span className="font-medium tabular-nums text-emerald-400">{fmtBRL(r.amount)}</span>
                     : <span className="text-zinc-600">—</span>,
          ]}
        />
      </Section>
    </div>
  );
}

/* ══════════════════════════  INSEMINAÇÕES  ══════════════════════════ */

export function InseminacoesReport({ rows, pastureNames, from, to }: {
  rows: any[]; pastureNames: PMap; from: string; to: string;
}) {
  const confirmed = rows.filter(r => r.status === 'CONFIRMED').length;
  const failed    = rows.filter(r => r.status === 'FAILED').length;
  const pending   = rows.filter(r => r.status === 'PENDING' || !r.status).length;
  const decided   = confirmed + failed;
  const taxa      = decided > 0 ? Math.round((confirmed / decided) * 100) : null;
  const pagas     = rows.filter(r => r.paid).length;
  const byTouro   = countBy(rows, r => r.bullSemen || 'Não informado');
  const byMonth   = countBy(rows, r => monthKey(r.date));

  // Taxa de sucesso por touro (apenas os decididos)
  const touroStats: Record<string, { ok: number; nok: number }> = {};
  for (const r of rows) {
    if (r.status !== 'CONFIRMED' && r.status !== 'FAILED') continue;
    const k = r.bullSemen || 'Não informado';
    if (!touroStats[k]) touroStats[k] = { ok: 0, nok: 0 };
    if (r.status === 'CONFIRMED') touroStats[k].ok++; else touroStats[k].nok++;
  }

  return (
    <div className="space-y-4">
      <KpiRow items={[
        { label: 'Total',       value: rows.length, tone: 'white' },
        { label: 'Prenhas',     value: confirmed, tone: 'emerald' },
        { label: 'Não prenhou', value: failed, tone: 'zinc' },
        { label: 'Aguardando',  value: pending, tone: 'amber' },
        { label: 'Taxa de prenhez', value: taxa !== null ? `${taxa}%` : '—', tone: 'purple', hint: decided > 0 ? `${decided} resultado(s) definido(s)` : 'sem resultados ainda' },
      ]} />

      {rows.length > 0 && (
        <div className="report-split grid gap-4 lg:grid-cols-2">
          <Section title="Uso por touro / sêmen" accent="purple">
            <BarList items={byTouro} total={rows.length} color="bg-purple-500" />
          </Section>
          <Section title="Desempenho por touro / sêmen" meta="apenas resultados já definidos" accent="purple">
            {Object.keys(touroStats).length === 0 ? (
              <EmptyState message="Nenhum resultado definido ainda." />
            ) : (
              <DataTable
                columns={[
                  { label: 'Touro / sêmen', width: '46%' },
                  { label: 'Prenhas', width: '18%', align: 'right' },
                  { label: 'Falhas',  width: '18%', align: 'right' },
                  { label: 'Taxa',    width: '18%', align: 'right' },
                ]}
                rows={Object.entries(touroStats).sort((a, b) => (b[1].ok + b[1].nok) - (a[1].ok + a[1].nok))}
                renderRow={([name, s]) => {
                  const tot = s.ok + s.nok;
                  const pct = tot > 0 ? Math.round((s.ok / tot) * 100) : 0;
                  return [
                    <span className="truncate text-zinc-300">{name}</span>,
                    <span className="tabular-nums text-emerald-400">{s.ok}</span>,
                    <span className="tabular-nums text-zinc-500">{s.nok}</span>,
                    <span className={`font-medium tabular-nums ${pct >= 60 ? 'text-emerald-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{pct}%</span>,
                  ];
                }}
              />
            )}
          </Section>
        </div>
      )}

      {byMonth.length > 1 && (
        <Section title="Evolução mensal" accent="purple">
          <BarList items={byMonth.slice().reverse()} total={rows.length} color="bg-purple-500/70" />
        </Section>
      )}

      <Section
        title="Registros de inseminação"
        meta={`${rows.length} registro(s) entre ${fmtDate(from)} e ${fmtDate(to)}`}
        right={`${pagas}/${rows.length} pagas`}
        accent="purple">
        <DataTable
          columns={[
            { label: 'Data',      width: '12%' },
            { label: 'Brinco',    width: '12%' },
            { label: 'Pasto',     width: '16%' },
            { label: 'Touro / sêmen', width: '22%' },
            { label: 'Resultado', width: '14%' },
            { label: 'Pagamento', width: '12%' },
            { label: 'Observação', width: '12%' },
          ]}
          rows={rows}
          empty="Nenhuma inseminação registrada no período."
          renderRow={(r) => [
            <span className="tabular-nums text-zinc-300">{fmtDate(r.date)}</span>,
            <Tag_Number value={r.tagNumber} />,
            <span className="truncate text-zinc-400">{pName(pastureNames, r.pastureId)}</span>,
            <span className="truncate text-zinc-300">{r.bullSemen || <span className="text-zinc-600 italic">—</span>}</span>,
            r.status === 'CONFIRMED' ? <Tag tone="emerald">Prenha</Tag>
              : r.status === 'FAILED' ? <Tag tone="neutral">Não prenhou</Tag>
              : <Tag tone="amber">Aguardando</Tag>,
            r.paid ? <Tag tone="blue">Pago</Tag> : <span className="text-xs text-zinc-600">Pendente</span>,
            <span className="truncate text-xs text-zinc-500">{r.obs || '—'}</span>,
          ]}
        />
      </Section>
    </div>
  );
}

/* ══════════════════════════  GERAL  ══════════════════════════ */

export function GeralReport({
  rebanho, movs, pastureNames, from, to,
}: {
  rebanho: { byCat: any[]; byPasture: any[]; pregnant: number; total: number };
  movs: any[]; pastureNames: PMap; from: string; to: string;
}) {
  const receita = movs.filter(m => m.type === 'SALE').reduce((s, m) => s + (m.amount ?? 0), 0);
  const despesa = movs.filter(m => m.type === 'ACQUISITION').reduce((s, m) => s + (m.amount ?? 0), 0);
  const saldo   = receita - despesa;

  const nVendas  = movs.filter(m => m.type === 'SALE').length;
  const nMortes  = movs.filter(m => m.type === 'DEATH').length;
  const nNasc    = movs.filter(m => m.type === 'BIRTH').length;
  const nAquis   = movs.filter(m => m.type === 'ACQUISITION').length;
  const nTransf  = movs.filter(m => m.type === 'TRANSFER').length;
  const nVacina  = movs.filter(m => m.type === 'VACCINE').length;

  const catItems = rebanho.byCat.map(r => ({
    label: CATEGORY_LABELS[r.category] ?? r.category,
    value: Number(r.count),
  }));
  const pastItems = rebanho.byPasture
    .map(r => ({ label: r.pastureId ? pName(pastureNames, r.pastureId) : 'Sem pasto', value: Number(r.count) }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
      <KpiRow items={[
        { label: 'Rebanho ativo', value: rebanho.total, tone: 'emerald' },
        { label: 'Prenhas',       value: rebanho.pregnant, tone: 'pink' },
        { label: 'Receita',       value: fmtBRL(receita), tone: 'emerald' },
        { label: 'Despesas',      value: despesa > 0 ? fmtBRL(despesa) : '—', tone: 'red' },
        { label: 'Saldo',         value: fmtBRL(saldo), tone: saldo >= 0 ? 'emerald' : 'red' },
      ]} />

      <div className="report-split grid gap-4 lg:grid-cols-2">
        <Section title="Rebanho por categoria" meta={`${rebanho.total} animais ativos`} accent="emerald">
          <BarList items={catItems} total={rebanho.total} color="bg-emerald-500" />
        </Section>
        <Section title="Distribuição por pasto" accent="emerald">
          {pastItems.length > 0
            ? <BarList items={pastItems} total={rebanho.total} color="bg-teal-500" />
            : <EmptyState message="Relatório filtrado por um pasto específico." />}
        </Section>
      </div>

      <Section title="Resumo do período" meta={`${fmtDate(from)} a ${fmtDate(to)}`} accent="blue">
        <div className="report-kpis grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'Nascimentos', value: nNasc,   tone: 'text-emerald-400' },
            { label: 'Mortes',      value: nMortes, tone: 'text-red-400' },
            { label: 'Vendas',      value: nVendas, tone: 'text-blue-400' },
            { label: 'Aquisições',  value: nAquis,  tone: 'text-amber-400' },
            { label: 'Transferências', value: nTransf, tone: 'text-zinc-300' },
            { label: 'Vacinas',     value: nVacina, tone: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="rounded-lg border border-zinc-800/70 bg-zinc-950/40 px-3 py-2.5 text-center">
              <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.08em] text-zinc-500">{s.label}</p>
              <p className={`mt-1.5 text-xl font-bold leading-none tabular-nums ${s.tone}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Movimentações do período" meta={`${movs.length} registro(s)`} accent="blue">
        <DataTable
          columns={[
            { label: 'Data',      width: '13%' },
            { label: 'Tipo',      width: '15%' },
            { label: 'Brinco',    width: '13%' },
            { label: 'Categoria', width: '13%' },
            { label: 'Descrição', width: '30%' },
            { label: 'Valor',     width: '16%', align: 'right' },
          ]}
          rows={movs}
          empty="Nenhuma movimentação no período."
          renderRow={(m) => {
            let desc = m.notes ?? '';
            if (m.type === 'TRANSFER') {
              desc = `${pName(pastureNames, m.fromPastureId)} → ${pName(pastureNames, m.toPastureId)}`;
            }
            const tone =
              m.type === 'SALE' ? 'blue' : m.type === 'DEATH' ? 'red' :
              m.type === 'BIRTH' ? 'emerald' : m.type === 'ACQUISITION' ? 'amber' :
              m.type === 'VACCINE' ? 'purple' : 'neutral';
            return [
              <span className="tabular-nums text-zinc-300">{fmtDate(m.date)}</span>,
              <Tag tone={tone}>{TX_LABELS[m.type] ?? m.type}</Tag>,
              <Tag_Number value={m.tagNumber} />,
              m.category ? <CategoryTag category={m.category} /> : <span className="text-zinc-600">—</span>,
              <span className="truncate text-zinc-400">{desc || <span className="text-zinc-600 italic">—</span>}</span>,
              m.amount ? (
                <span className={`font-medium tabular-nums ${m.type === 'SALE' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {fmtBRL(m.amount)}
                </span>
              ) : <span className="text-zinc-600">—</span>,
            ];
          }}
        />
      </Section>
    </div>
  );
}

/* ══════════════════════════  POR PASTO  ══════════════════════════ */

export function PastoReport({ animals: list, insems, pastureNames }: {
  animals: any[]; insems: any[]; pastureNames: PMap;
}) {
  const grouped: Record<string, any[]> = {};
  for (const a of list) {
    const key = a.pastureName ?? 'Sem pasto';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  }
  const names = Object.keys(grouped).sort();

  if (names.length === 0) {
    return <EmptyState message="Nenhum animal ativo encontrado para o filtro selecionado." />;
  }

  return (
    <div className="space-y-4">
      <KpiRow items={[
        { label: 'Pastos com animais', value: names.length, tone: 'emerald' },
        { label: 'Animais ativos',     value: list.length, tone: 'white' },
        { label: 'Prenhas',            value: list.filter(a => a.isPregnant).length, tone: 'pink' },
        { label: 'Média por pasto',    value: (list.length / names.length).toFixed(1).replace('.', ','), tone: 'blue' },
      ]} />

      {names.map(name => {
        const rows = grouped[name];
        const pid = rows[0]?.pastureId;
        const pIns = pid != null ? insems.filter(i => i.pastureId === pid) : [];
        const catCount = countBy(rows, r => CATEGORY_LABELS[r.category] ?? r.category);
        return (
          <Section
            key={name}
            title={name}
            meta={catCount.map(c => `${c.value} ${c.label.toLowerCase()}`).join(' · ')}
            right={`${rows.length} animais`}
            accent="emerald">
            <div className="space-y-4">
              <DataTable
                columns={[
                  { label: 'Brinco',    width: '15%' },
                  { label: 'Categoria', width: '15%' },
                  { label: 'Peso (kg)', width: '13%', align: 'right' },
                  { label: 'Prenha',    width: '12%' },
                  { label: 'Observações de saúde', width: '45%' },
                ]}
                rows={rows}
                empty="Pasto vazio."
                renderRow={(a) => [
                  <Tag_Number value={a.tagNumber} />,
                  <CategoryTag category={a.category} />,
                  <span className="tabular-nums text-zinc-300">{a.weight ?? '—'}</span>,
                  a.isPregnant ? <Tag tone="pink">Sim</Tag> : <span className="text-zinc-600">—</span>,
                  <span className="text-zinc-500">{a.healthNotes || <span className="text-zinc-700 italic">—</span>}</span>,
                ]}
              />
              {pIns.length > 0 && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    Inseminações do pasto ({pIns.length})
                  </p>
                  <DataTable
                    columns={[
                      { label: 'Data',   width: '18%' },
                      { label: 'Brinco', width: '18%' },
                      { label: 'Touro / sêmen', width: '38%' },
                      { label: 'Resultado', width: '26%' },
                    ]}
                    rows={pIns}
                    renderRow={(r) => [
                      <span className="tabular-nums text-zinc-400">{fmtDate(r.date)}</span>,
                      <Tag_Number value={r.tagNumber} />,
                      <span className="truncate text-zinc-400">{r.bullSemen || '—'}</span>,
                      r.status === 'CONFIRMED' ? <Tag tone="emerald">Prenha</Tag>
                        : r.status === 'FAILED' ? <Tag tone="neutral">Não prenhou</Tag>
                        : <Tag tone="amber">Aguardando</Tag>,
                    ]}
                  />
                </div>
              )}
            </div>
          </Section>
        );
      })}
    </div>
  );
}
