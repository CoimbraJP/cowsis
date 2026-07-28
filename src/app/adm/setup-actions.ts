'use server';

import { db } from '@/db';
import {
  animals, pastures, inseminations, births, animalTransactions,
  pastureHistory, pastureInventories, pastureInventoryItems,
  pastureSnapshots, pastureSnapshotItems,
} from '@/db/schema';
import { sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/* ══════════════════════════════════════════════════════════
   RESET TOTAL — apaga tudo, inclusive pastos
   ══════════════════════════════════════════════════════════ */

export type ResetResult = { ok: boolean; message: string; deleted?: Record<string, number> };

export async function resetDatabase(confirmText: string): Promise<ResetResult> {
  if (confirmText.trim().toUpperCase() !== 'APAGAR TUDO') {
    return { ok: false, message: 'Texto de confirmação incorreto. Digite exatamente: APAGAR TUDO' };
  }

  try {
    const before = await countAll();

    // Ordem importa: filhos antes dos pais (FKs)
    await db.delete(pastureSnapshotItems);
    await db.delete(pastureSnapshots);
    await db.delete(pastureInventoryItems);
    await db.delete(pastureInventories);
    await db.delete(pastureHistory);
    await db.delete(animalTransactions);
    await db.delete(inseminations);
    await db.delete(births);
    await db.delete(animals);
    await db.delete(pastures);

    // Reinicia os contadores de ID para começar do 1
    await db.execute(sql`
      ALTER SEQUENCE animals_id_seq RESTART WITH 1;
      ALTER SEQUENCE pastures_id_seq RESTART WITH 1;
      ALTER SEQUENCE inseminations_id_seq RESTART WITH 1;
      ALTER SEQUENCE births_id_seq RESTART WITH 1;
      ALTER SEQUENCE animal_transactions_id_seq RESTART WITH 1;
      ALTER SEQUENCE pasture_history_id_seq RESTART WITH 1;
      ALTER SEQUENCE pasture_inventories_id_seq RESTART WITH 1;
      ALTER SEQUENCE pasture_inventory_items_id_seq RESTART WITH 1;
      ALTER SEQUENCE pasture_snapshots_id_seq RESTART WITH 1;
      ALTER SEQUENCE pasture_snapshot_items_id_seq RESTART WITH 1;
    `);

    revalidatePath('/', 'layout');

    return {
      ok: true,
      message: 'Banco de dados zerado com sucesso. O sistema está pronto para a carga inicial.',
      deleted: before,
    };
  } catch (err: any) {
    console.error('Erro no reset:', err);
    return { ok: false, message: `Falha ao zerar o banco: ${err?.message ?? 'erro desconhecido'}` };
  }
}

async function countAll(): Promise<Record<string, number>> {
  const one = async (table: any, label: string) => {
    const [r] = await db.select({ c: sql<number>`count(*)::int` }).from(table);
    return [label, Number(r?.c ?? 0)] as const;
  };
  const pairs = await Promise.all([
    one(animals, 'Animais'),
    one(pastures, 'Pastos'),
    one(inseminations, 'Inseminações'),
    one(animalTransactions, 'Movimentações'),
    one(pastureHistory, 'Histórico de pasto'),
    one(pastureSnapshots, 'Composições'),
    one(births, 'Nascimentos'),
  ]);
  return Object.fromEntries(pairs);
}

export async function getDatabaseCounts() {
  return countAll();
}

/* ══════════════════════════════════════════════════════════
   IMPORTAÇÃO DA PLANILHA
   ══════════════════════════════════════════════════════════ */

const CATEGORIAS_VALIDAS = ['VACA', 'TOURO', 'NOVILHA', 'NOVILHO', 'BEZERRA', 'BEZERRO'] as const;

export type ParsedRow = {
  linha: number;
  brinco: string | null;
  categoria: string;
  pasto: string;
  peso: number | null;
  prenha: boolean;
  observacoes: string | null;
};

export type ImportProblem = { linha: number; campo: string; valor: string; erro: string };

export type ImportPreview = {
  ok: boolean;
  rows: ParsedRow[];
  problems: ImportProblem[];
  pastos: { nome: string; quantidade: number }[];
  categorias: { nome: string; quantidade: number }[];
  totalLinhas: number;
};

/** Normaliza um nome de pasto para detectar duplicatas por diferença de caixa/acento/espaço */
function normalizePasture(s: string) {
  return s.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeCategory(s: string) {
  return s.trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parseBool(v: any): boolean {
  if (v === true) return true;
  if (v == null) return false;
  const s = String(v).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return s === 'SIM' || s === 'S' || s === 'TRUE' || s === '1' || s === 'X';
}

function parseNumber(v: any): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  const s = String(v).trim().replace(/[^\d,.-]/g, '').replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return isFinite(n) ? n : null;
}

/** Valida as linhas cruas vindas da planilha (já convertidas para JSON no cliente) */
export async function validarImportacao(raw: Record<string, any>[]): Promise<ImportPreview> {
  const problems: ImportProblem[] = [];
  const rows: ParsedRow[] = [];
  const brincosVistos = new Map<string, number>();
  const pastoCanonico = new Map<string, string>();   // normalizado -> primeira grafia vista
  const pastoVariantes = new Map<string, Set<string>>();

  raw.forEach((r, idx) => {
    const linha = idx + 2; // +1 cabeçalho, +1 base 1

    const get = (...keys: string[]) => {
      for (const k of keys) {
        const found = Object.keys(r).find(kk => normalizeCategory(kk) === normalizeCategory(k));
        if (found && r[found] != null && String(r[found]).trim() !== '') return String(r[found]).trim();
      }
      return '';
    };

    const brincoRaw = get('Brinco');
    const catRaw    = get('Categoria');
    const pastoRaw  = get('Pasto');
    const pesoRaw   = get('Peso (kg)', 'Peso');
    const prenhaRaw = get('Prenha');
    const obsRaw    = get('Observações', 'Observacoes', 'Obs');

    // Linha completamente vazia -> ignora silenciosamente
    if (!brincoRaw && !catRaw && !pastoRaw && !pesoRaw && !obsRaw) return;

    let temErro = false;

    // Categoria
    const cat = normalizeCategory(catRaw);
    if (!catRaw) {
      problems.push({ linha, campo: 'Categoria', valor: '(vazio)', erro: 'Categoria é obrigatória' });
      temErro = true;
    } else if (!CATEGORIAS_VALIDAS.includes(cat as any)) {
      problems.push({
        linha, campo: 'Categoria', valor: catRaw,
        erro: `Categoria inválida. Use: ${CATEGORIAS_VALIDAS.join(', ')}`,
      });
      temErro = true;
    }

    // Pasto
    if (!pastoRaw) {
      problems.push({ linha, campo: 'Pasto', valor: '(vazio)', erro: 'Pasto é obrigatório' });
      temErro = true;
    } else {
      const norm = normalizePasture(pastoRaw);
      if (!pastoCanonico.has(norm)) pastoCanonico.set(norm, pastoRaw.trim());
      if (!pastoVariantes.has(norm)) pastoVariantes.set(norm, new Set());
      pastoVariantes.get(norm)!.add(pastoRaw.trim());
    }

    // Brinco duplicado
    if (brincoRaw) {
      if (brincosVistos.has(brincoRaw)) {
        problems.push({
          linha, campo: 'Brinco', valor: brincoRaw,
          erro: `Brinco repetido (já usado na linha ${brincosVistos.get(brincoRaw)})`,
        });
        temErro = true;
      } else {
        brincosVistos.set(brincoRaw, linha);
      }
    }

    // Peso
    const peso = parseNumber(pesoRaw);
    if (pesoRaw && peso === null) {
      problems.push({ linha, campo: 'Peso (kg)', valor: pesoRaw, erro: 'Peso deve ser apenas número (ex: 480)' });
      temErro = true;
    } else if (peso !== null && (peso <= 0 || peso > 2000)) {
      problems.push({ linha, campo: 'Peso (kg)', valor: pesoRaw, erro: 'Peso fora do intervalo esperado (1 a 2000 kg)' });
      temErro = true;
    }

    // Prenha só faz sentido em fêmeas adultas
    const prenha = parseBool(prenhaRaw);
    if (prenha && cat !== 'VACA' && cat !== 'NOVILHA') {
      problems.push({
        linha, campo: 'Prenha', valor: prenhaRaw,
        erro: `"Prenha = SIM" não se aplica à categoria ${cat || '(vazia)'}`,
      });
      temErro = true;
    }

    if (!temErro) {
      rows.push({
        linha,
        brinco: brincoRaw || null,
        categoria: cat,
        pasto: pastoCanonico.get(normalizePasture(pastoRaw)) ?? pastoRaw.trim(),
        peso,
        prenha,
        observacoes: obsRaw || null,
      });
    }
  });

  // Aviso: mesmo pasto escrito de formas diferentes
  for (const [norm, variantes] of pastoVariantes) {
    if (variantes.size > 1) {
      problems.push({
        linha: 0,
        campo: 'Pasto',
        valor: [...variantes].join(' / '),
        erro: `Grafias diferentes do mesmo pasto serão unificadas em "${pastoCanonico.get(norm)}"`,
      });
    }
  }

  const contarPasto = new Map<string, number>();
  const contarCat   = new Map<string, number>();
  for (const r of rows) {
    contarPasto.set(r.pasto, (contarPasto.get(r.pasto) ?? 0) + 1);
    contarCat.set(r.categoria, (contarCat.get(r.categoria) ?? 0) + 1);
  }

  const erros = problems.filter(p => p.linha !== 0);

  return {
    ok: erros.length === 0 && rows.length > 0,
    rows,
    problems,
    pastos: [...contarPasto.entries()].map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    categorias: [...contarCat.entries()].map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade),
    totalLinhas: rows.length + erros.length,
  };
}

export type ImportResult = {
  ok: boolean;
  message: string;
  pastosCriados?: number;
  animaisCriados?: number;
};

/** Executa a importação. Só roda se a validação passar. */
export async function executarImportacao(rows: ParsedRow[]): Promise<ImportResult> {
  if (!rows || rows.length === 0) {
    return { ok: false, message: 'Nenhuma linha válida para importar.' };
  }

  try {
    // 1. Cria os pastos únicos
    const nomesPasto = [...new Set(rows.map(r => r.pasto))];
    const criados = await db.insert(pastures)
      .values(nomesPasto.map(name => ({ name, active: true })))
      .returning({ id: pastures.id, name: pastures.name });

    const mapaPasto = new Map(criados.map(p => [p.name, p.id]));

    // 2. Cria os animais
    const hoje = new Date().toISOString().split('T')[0];
    const animaisInseridos = await db.insert(animals)
      .values(rows.map(r => ({
        tagNumber: r.brinco,
        category: r.categoria as any,
        status: 'ACTIVE' as const,
        currentPastureId: mapaPasto.get(r.pasto) ?? null,
        weight: r.peso,
        healthNotes: r.observacoes,
        isPregnant: r.prenha,
      })))
      .returning({ id: animals.id, pastureId: animals.currentPastureId });

    // 3. Abre o histórico de pasto de cada animal
    const historico = animaisInseridos
      .filter(a => a.pastureId != null)
      .map(a => ({ animalId: a.id, pastureId: a.pastureId!, enteredAt: hoje, exitedAt: null }));

    if (historico.length > 0) {
      await db.insert(pastureHistory).values(historico);
    }

    revalidatePath('/', 'layout');

    return {
      ok: true,
      message: 'Importação concluída com sucesso.',
      pastosCriados: criados.length,
      animaisCriados: animaisInseridos.length,
    };
  } catch (err: any) {
    console.error('Erro na importação:', err);
    const msg = String(err?.message ?? '');
    if (msg.includes('duplicate key') && msg.includes('tag_number')) {
      return { ok: false, message: 'Existe um brinco na planilha que já está cadastrado no sistema. Zere o banco antes de importar.' };
    }
    return { ok: false, message: `Falha na importação: ${msg || 'erro desconhecido'}` };
  }
}
