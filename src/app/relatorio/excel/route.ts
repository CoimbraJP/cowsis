import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import {
  getPastures, getRebanho, getMortes, getNascimentos, getVendas,
  getAquisicoes, getInseminacoes, getMovimentacoes, getTodosAnimais, type Range,
} from '../data';

export const dynamic = 'force-dynamic';

const CAT: Record<string, string> = {
  VACA: 'Vaca', BEZERRO: 'Bezerro', BEZERRA: 'Bezerra', TOURO: 'Touro',
  NOVILHA: 'Novilha', NOVILHO: 'Novilho', 'BÚFALO': 'Búfalo', 'BÚFALA': 'Búfala',
};
const ST: Record<string, string> = { ACTIVE: 'Ativo', SOLD: 'Vendido', DEAD: 'Morto' };
const INS: Record<string, string> = { CONFIRMED: 'Prenha', FAILED: 'Não prenhou', PENDING: 'Aguardando' };
const TX: Record<string, string> = {
  SALE: 'Venda', DEATH: 'Morte', BIRTH: 'Nascimento',
  ACQUISITION: 'Aquisição', TRANSFER: 'Transferência', VACCINE: 'Vacina',
};

const d = (s?: string | null) => {
  if (!s) return '';
  const [y, m, dd] = s.split('-');
  return y && m && dd ? `${dd}/${m}/${y}` : s;
};

function sheet(wb: XLSX.WorkBook, name: string, rows: any[], widths: number[]) {
  const ws = rows.length > 0
    ? XLSX.utils.json_to_sheet(rows)
    : XLSX.utils.aoa_to_sheet([['Nenhum registro no período selecionado.']]);
  ws['!cols'] = widths.map(w => ({ wch: w }));
  if (rows.length > 0) ws['!autofilter'] = { ref: ws['!ref'] as string };
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const to   = sp.get('to')   || new Date().toISOString().split('T')[0];
    const from = sp.get('from') || '2000-01-01';
    const pRaw = sp.get('pastureId') || '';
    const pid  = pRaw && !isNaN(Number(pRaw)) ? Number(pRaw) : null;
    const range: Range = { from, to, pid };

    const [pastures, rebanho, todos, mortes, nasc, vendas, aquis, insems, movs] =
      await Promise.all([
        getPastures(),
        getRebanho(pid),
        getTodosAnimais(),
        getMortes(range),
        getNascimentos(range),
        getVendas(range),
        getAquisicoes(range),
        getInseminacoes(range),
        getMovimentacoes(range),
      ]);

    const pn: Record<number, string> = Object.fromEntries(pastures.map(p => [p.id, p.name]));
    const nm = (id?: number | null) => (id ? (pn[id] ?? `Pasto #${id}`) : '');

    const receita = vendas.reduce((s, r) => s + (r.amount ?? 0), 0);
    const despesa = aquis.reduce((s, r) => s + (r.amount ?? 0), 0);
    const confirmed = insems.filter(i => i.status === 'CONFIRMED').length;
    const failed    = insems.filter(i => i.status === 'FAILED').length;
    const taxa = confirmed + failed > 0 ? Math.round((confirmed / (confirmed + failed)) * 100) : null;

    const wb = XLSX.utils.book_new();

    /* ── Resumo ── */
    const resumo: any[] = [
      { Indicador: 'Período do relatório', Valor: `${d(from)} a ${d(to)}` },
      { Indicador: 'Pasto', Valor: pid ? nm(pid) : 'Todos' },
      { Indicador: 'Emitido em', Valor: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) },
      { Indicador: '', Valor: '' },
      { Indicador: 'REBANHO', Valor: '' },
      { Indicador: 'Animais ativos', Valor: rebanho.total },
      { Indicador: 'Fêmeas prenhas', Valor: rebanho.pregnant },
      ...rebanho.byCat.map(c => ({ Indicador: `  ${CAT[c.category] ?? c.category}`, Valor: Number(c.count) })),
      { Indicador: '', Valor: '' },
      { Indicador: 'MOVIMENTO NO PERÍODO', Valor: '' },
      { Indicador: 'Nascimentos', Valor: nasc.length },
      { Indicador: 'Mortes', Valor: mortes.length },
      { Indicador: 'Vendas', Valor: vendas.length },
      { Indicador: 'Aquisições', Valor: aquis.length },
      { Indicador: 'Inseminações', Valor: insems.length },
      { Indicador: 'Taxa de prenhez', Valor: taxa !== null ? `${taxa}%` : 'sem resultados' },
      { Indicador: '', Valor: '' },
      { Indicador: 'FINANCEIRO', Valor: '' },
      { Indicador: 'Receita (vendas)', Valor: receita },
      { Indicador: 'Despesa (aquisições)', Valor: despesa },
      { Indicador: 'Saldo', Valor: receita - despesa },
    ];
    sheet(wb, 'Resumo', resumo, [34, 26]);

    /* ── Rebanho por pasto ── */
    const porPasto = pastures.map(p => ({
      Pasto: p.name,
      Situação: p.active ? 'Ativo' : 'Inativo',
      'Animais ativos': todos.filter(a => a.status === 'ACTIVE' && a.pastureName === p.name).length,
    }));
    sheet(wb, 'Pastos', porPasto, [30, 12, 16]);

    /* ── Inventário completo ── */
    sheet(wb, 'Animais', todos.map(a => ({
      Brinco: a.tagNumber ?? '',
      Categoria: CAT[a.category] ?? a.category,
      Status: ST[a.status] ?? a.status,
      Pasto: a.pastureName ?? '',
      'Peso (kg)': a.weight ?? '',
      Prenha: a.isPregnant ? 'Sim' : 'Não',
      Observações: a.healthNotes ?? '',
    })), [12, 12, 10, 24, 10, 8, 44]);

    /* ── Mortes ── */
    sheet(wb, 'Mortes', mortes.map(r => ({
      Data: d(r.date),
      Brinco: r.tagNumber ?? '',
      Categoria: CAT[r.category ?? ''] ?? r.category ?? '',
      Pasto: nm(r.pastureId),
      'Causa / observação': r.notes ?? '',
    })), [12, 12, 12, 24, 46]);

    /* ── Nascimentos ── */
    sheet(wb, 'Nascimentos', nasc.map(r => ({
      Data: d(r.date),
      Brinco: r.tagNumber ?? '',
      Categoria: CAT[r.category ?? ''] ?? r.category ?? '',
      Pasto: nm(r.pastureId),
      'Situação atual': ST[r.status ?? ''] ?? '',
      Observação: r.notes ?? '',
    })), [12, 12, 12, 24, 14, 40]);

    /* ── Vendas ── */
    sheet(wb, 'Vendas', vendas.map(r => ({
      Data: d(r.date),
      Brinco: r.tagNumber ?? '',
      Categoria: CAT[r.category ?? ''] ?? r.category ?? '',
      'Pasto de origem': nm(r.pastureId),
      'Comprador / observação': r.notes ?? '',
      'Valor (R$)': r.amount ?? '',
    })), [12, 12, 12, 24, 36, 14]);

    /* ── Aquisições ── */
    sheet(wb, 'Aquisições', aquis.map(r => ({
      Data: d(r.date),
      Brinco: r.tagNumber ?? '',
      Categoria: CAT[r.category ?? ''] ?? r.category ?? '',
      Pasto: nm(r.pastureId),
      Observação: r.notes ?? '',
      'Valor (R$)': r.amount ?? '',
    })), [12, 12, 12, 24, 36, 14]);

    /* ── Inseminações ── */
    sheet(wb, 'Inseminações', insems.map(r => ({
      Data: d(r.date),
      Brinco: r.tagNumber ?? '',
      Categoria: CAT[r.category ?? ''] ?? r.category ?? '',
      Pasto: nm(r.pastureId),
      'Touro / sêmen': r.bullSemen ?? '',
      Resultado: INS[r.status ?? 'PENDING'] ?? '',
      Pagamento: r.paid ? 'Pago' : 'Pendente',
      Observação: r.obs ?? '',
    })), [12, 12, 12, 22, 24, 14, 12, 34]);

    /* ── Movimentações ── */
    sheet(wb, 'Movimentações', movs.map(r => ({
      Data: d(r.date),
      Tipo: TX[r.type] ?? r.type,
      Brinco: r.tagNumber ?? '',
      Categoria: CAT[r.category ?? ''] ?? r.category ?? '',
      'Pasto origem': nm(r.fromPastureId),
      'Pasto destino': nm(r.toPastureId),
      Observação: r.notes ?? '',
      'Valor (R$)': r.amount ?? '',
    })), [12, 15, 12, 12, 22, 22, 34, 14]);

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="relatorio-pecuaria-rs-${from}_a_${to}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Erro ao gerar Excel:', err);
    return NextResponse.json({ error: 'Falha ao gerar a planilha' }, { status: 500 });
  }
}
