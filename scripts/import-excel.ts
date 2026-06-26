import * as xlsx from 'xlsx';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema';
import * as dotenv from 'dotenv';
import { eq, sql } from 'drizzle-orm';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DATABASE_URL!;
if (!connectionString) throw new Error('DATABASE_URL não definida em .env.local');

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateStr(value: any): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  return null;
}

function toTag(value: any): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s || s === 'null') return null;
  return s.toUpperCase();
}

const SKIP_TAGS = new Set([
  'TOTAL', 'VACAS', 'BEZERRO', 'BEZERRA', 'TOURO', 'NOVILHA', 'NOVILHO',
  'BÚFALO', 'BÚFALA', 'FALTANDO', 'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL',
  'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
]);

function isValidTag(tag: string | null): boolean {
  if (!tag) return false;
  if (SKIP_TAGS.has(tag)) return false;
  if (tag.startsWith('=')) return false; // formula leaked
  return true;
}

// ─── Pasture names ────────────────────────────────────────────────────────────

const PASTURE_NAMES = [
  'ÁGUA LIMPA', 'ABÓBORA', 'PITEIRA DE CIMA', 'CAVARU', 'MEIO', 'DALVINA',
  'PITEIRA', 'CÁGADO', 'CAMPINHO', 'PEDREIRA', 'CARAMUJO', 'TIÃO CAPITÃO',
  'VILETA', 'FAZENDA', 'GAZIN',
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const filePath = path.resolve(process.cwd(), '06 - Junho.xlsx');
  console.log('📂 Lendo arquivo:', filePath);
  const workbook = xlsx.readFile(filePath, { cellDates: true, sheetStubs: false });

  // ── 1. Pastures ─────────────────────────────────────────────────────────────
  console.log('\n🌿 Inserindo pastos...');
  const pastureMap = new Map<string, number>();

  for (const name of PASTURE_NAMES) {
    const existing = await db
      .select()
      .from(schema.pastures)
      .where(eq(schema.pastures.name, name))
      .limit(1);

    if (existing.length > 0) {
      pastureMap.set(name, existing[0].id);
      console.log(`  ↳ já existe: ${name} (id=${existing[0].id})`);
      continue;
    }

    const [inserted] = await db
      .insert(schema.pastures)
      .values({ name, active: true })
      .returning();
    pastureMap.set(name, inserted.id);
    console.log(`  ✓ ${name} (id=${inserted.id})`);
  }

  // ── 2. Animals from BRINCOS POR COR ──────────────────────────────────────
  console.log('\n🐄 Inserindo animais...');
  const ws = workbook.Sheets['BRINCOS POR COR'];
  const brincosCorData = xlsx.utils.sheet_to_json<any[]>(ws, { header: 1 });

  const tagToPasture = new Map<string, string>();
  let currentPasture = '';

  for (const row of brincosCorData) {
    if (!row || row.length === 0) continue;
    const tag = toTag(row[0]);
    const pastureName = row[1] ? String(row[1]).trim().toUpperCase() : null;
    if (pastureName && PASTURE_NAMES.includes(pastureName)) currentPasture = pastureName;
    if (tag && !SKIP_TAGS.has(tag)) tagToPasture.set(tag, currentPasture);
  }

  const animalTagToId = new Map<string, number>();
  let insertedAnimals = 0;

  for (const [tag, pastureName] of tagToPasture) {
    const pastureId = pastureName ? (pastureMap.get(pastureName) ?? null) : null;
    const [inserted] = await db
      .insert(schema.animals)
      .values({
        tagNumber: tag,
        category: 'VACA',
        status: 'ACTIVE',
        currentPastureId: pastureId,
      })
      .returning();
    animalTagToId.set(tag, inserted.id);
    insertedAnimals++;
  }

  console.log(`  ✓ ${insertedAnimals} animais inseridos`);

  // Lookup all animals for tag-based lookups later
  const allAnimals = await db.select().from(schema.animals);
  for (const a of allAnimals) {
    if (a.tagNumber) animalTagToId.set(a.tagNumber, a.id);
  }

  // ── 3. Pasture inventories ────────────────────────────────────────────────
  console.log('\n📋 Inserindo inventários históricos...');
  let totalInventories = 0;

  for (const pastureName of PASTURE_NAMES) {
    const sheetName = pastureName;
    const pws = workbook.Sheets[sheetName];
    if (!pws) { console.log(`  ⚠ aba não encontrada: ${sheetName}`); continue; }

    const rows = xlsx.utils.sheet_to_json<any[]>(pws, { header: 1 });
    if (rows.length < 3) continue;

    const pastureId = pastureMap.get(pastureName);
    if (!pastureId) continue;

    // Row 1 has date headers (row 0 is pasture title, row 1 is dates)
    const headerRow: any[] = rows[1] ?? [];

    const dateCols: { colIdx: number; label: string; dateStr: string | null }[] = [];
    for (let c = 0; c < headerRow.length; c++) {
      const v = headerRow[c];
      if (!v) continue;
      if (v instanceof Date) {
        dateCols.push({ colIdx: c, label: v.toISOString().split('T')[0], dateStr: toDateStr(v) });
      } else if (typeof v === 'string') {
        const upper = v.toUpperCase();
        if (['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'].includes(upper)) {
          dateCols.push({ colIdx: c, label: v, dateStr: null });
        }
      }
    }

    const dataRows = rows.slice(2);

    for (const dc of dateCols) {
      const tagList: string[] = [];
      for (const row of dataRows) {
        if (!row) continue;
        const tag = toTag(row[dc.colIdx]);
        if (tag && isValidTag(tag)) tagList.push(tag);
      }
      if (tagList.length === 0) continue;

      const [inv] = await db
        .insert(schema.pastureInventories)
        .values({ pastureId, name: dc.label, inventoryDate: dc.dateStr, observations: null })
        .returning();

      const items = tagList.flatMap((tag) => {
        const animalId = animalTagToId.get(tag);
        if (!animalId) return [];
        return [{ inventoryId: inv.id, animalId }];
      });

      if (items.length > 0) {
        await db.insert(schema.pastureInventoryItems).values(items);
      }
      totalInventories++;
    }
    console.log(`  ✓ ${pastureName}: ${dateCols.length} contagens`);
  }
  console.log(`  Total: ${totalInventories} inventários`);

  // ── 4. Births ────────────────────────────────────────────────────────────
  console.log('\n🐣 Inserindo nascimentos...');
  const wsNasc = workbook.Sheets['NASCIMENTO'];
  const nascRows = xlsx.utils.sheet_to_json<any[]>(wsNasc, { header: 1 }).slice(1);
  let birthCount = 0;

  for (const row of nascRows) {
    if (!row || !row[0]) continue;
    const motherTag = toTag(row[0]);
    const birthType = row[1] ? String(row[1]).trim() : null;
    const obs = row[2] ? String(row[2]).trim() : null;
    const motherId = motherTag ? animalTagToId.get(motherTag) : null;
    if (!motherId) continue;

    const gender = birthType?.includes('MACHO') ? 'MACHO'
                 : birthType?.includes('FEMEA') || birthType?.includes('BEZERRA') ? 'FEMEA'
                 : null;
    const status = obs?.toUpperCase().includes('MORTO') ? 'STILLBORN' : 'ALIVE';

    await db.insert(schema.births).values({
      motherId,
      birthDate: null,
      offspringGender: gender,
      status: status as any,
      observations: obs,
    });
    birthCount++;
  }
  console.log(`  ✓ ${birthCount} nascimentos`);

  // ── 5. Inseminations ─────────────────────────────────────────────────────
  console.log('\n💉 Inserindo inseminações...');
  let insemCount = 0;

  // NOV 2024
  const wsInsemNov = workbook.Sheets['INSEMINAÇÃO NOV'];
  if (wsInsemNov) {
    const rows = xlsx.utils.sheet_to_json<any[]>(wsInsemNov, { header: 1 }).slice(3);
    for (const row of rows) {
      if (!row) continue;
      for (let offset of [0, 2]) {
        const tag = toTag(row[offset]);
        if (!tag || isNaN(Number(tag))) continue;
        const obs = row[offset + 1] ? String(row[offset + 1]).trim() : null;
        const animalId = animalTagToId.get(tag);
        if (!animalId) continue;
        await db.insert(schema.inseminations).values({
          animalId, inseminationDate: '2024-11-30', bullSemen: offset === 0 ? 'LOTE PULLMA' : 'RESULTADO COOL',
          status: 'PENDING', observations: obs,
        });
        insemCount++;
      }
    }
  }

  // FEV 2025
  const wsInsemFev25 = workbook.Sheets['INSEMINAÇÃO FEV 25'];
  if (wsInsemFev25) {
    const rows = xlsx.utils.sheet_to_json<any[]>(wsInsemFev25, { header: 1 }).slice(3);
    for (const row of rows) {
      if (!row) continue;
      for (let offset of [0, 2]) {
        const tag = toTag(row[offset]);
        if (!tag || isNaN(Number(tag))) continue;
        const animalId = animalTagToId.get(tag);
        if (!animalId) continue;
        await db.insert(schema.inseminations).values({
          animalId, inseminationDate: '2025-02-01', bullSemen: offset === 0 ? 'TOURO COOL' : 'TOURO DUENDE DA GRENDENE',
          status: 'PENDING', observations: null,
        });
        insemCount++;
      }
    }
  }

  // FEV 2026
  const wsInsemFev26 = workbook.Sheets['INSEMINAÇÃO FEV 26 '];
  if (wsInsemFev26) {
    const rows = xlsx.utils.sheet_to_json<any[]>(wsInsemFev26, { header: 1 }).slice(2);
    for (const row of rows) {
      if (!row || !row[0]) continue;
      const tag = toTag(row[0]);
      if (!tag || isNaN(Number(tag))) continue;
      const animalId = animalTagToId.get(tag);
      if (!animalId) continue;
      const confirmed = row[1] ? 'CONFIRMED' : 'PENDING';
      await db.insert(schema.inseminations).values({
        animalId, inseminationDate: '2026-02-01', bullSemen: null,
        status: confirmed as any, observations: null,
      });
      insemCount++;
    }
  }

  // MAIO 2026
  const wsInsemMaio = workbook.Sheets['INSEMINAÇÃO MAIO 26'];
  if (wsInsemMaio) {
    const rows = xlsx.utils.sheet_to_json<any[]>(wsInsemMaio, { header: 1 }).slice(2);
    for (const row of rows) {
      if (!row || !row[0]) continue;
      const tag = toTag(row[0]);
      if (!tag || isNaN(Number(tag))) continue;
      const animalId = animalTagToId.get(tag);
      if (!animalId) continue;
      const bullSemen = row[1] ? String(row[1]).trim() : null;
      await db.insert(schema.inseminations).values({
        animalId, inseminationDate: '2026-05-08', bullSemen,
        status: 'PENDING', observations: null,
      });
      insemCount++;
    }
  }

  console.log(`  ✓ ${insemCount} inseminações`);

  // ── 6. Deaths ────────────────────────────────────────────────────────────
  console.log('\n💀 Inserindo mortes...');
  const wsMortes = workbook.Sheets['MORTES 2025'];
  let deathCount = 0;
  if (wsMortes) {
    const rows = xlsx.utils.sheet_to_json<any[]>(wsMortes, { header: 1 }).slice(1);
    const categories = ['BEZERRA', 'BEZERRO', 'NOVILHA', 'VACA', 'TOURO', 'BÚFALO'] as const;
    for (const row of rows) {
      if (!row || typeof row[0] !== 'string') continue;
      const month = row[0];
      for (let i = 1; i <= 6; i++) {
        const qty = Number(row[i]);
        if (!qty || isNaN(qty)) continue;
        for (let d = 0; d < qty; d++) {
          const [deadAnimal] = await db.insert(schema.animals).values({
            tagNumber: null, category: categories[i - 1], status: 'DEAD',
          }).returning();
          await db.insert(schema.animalTransactions).values({
            animalId: deadAnimal.id, type: 'DEATH',
            transactionDate: null, monthLabel: `${month} 2026`,
            notes: `Morte registrada: ${categories[i - 1]}`,
          });
          deathCount++;
        }
      }
    }
  }
  console.log(`  ✓ ${deathCount} mortes`);

  // ── 7. Sales ─────────────────────────────────────────────────────────────
  console.log('\n💰 Inserindo vendas...');
  const wsVendas = workbook.Sheets['VENDAS 2026'];
  let saleCount = 0;
  if (wsVendas) {
    const rows = xlsx.utils.sheet_to_json<any[]>(wsVendas, { header: 1 }).slice(1);
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    for (const row of rows) {
      if (!row || !row[0]) continue;
      const month = String(row[0]).trim();
      if (!months.includes(month)) continue;
      const tagsRaw = row[1] ? String(row[1]) : '';
      const tags = tagsRaw.split(',').map((t: string) => t.trim()).filter(Boolean);

      for (const rawTag of tags) {
        const tag = toTag(rawTag.replace(/\s*\(.*?\)/g, '').trim());
        if (!tag) continue;
        let animalId = animalTagToId.get(tag);

        if (animalId) {
          await db.update(schema.animals).set({ status: 'SOLD' }).where(eq(schema.animals.id, animalId));
        } else {
          const [a] = await db.insert(schema.animals).values({
            tagNumber: isNaN(Number(tag)) ? null : tag,
            category: 'VACA', status: 'SOLD',
          }).returning();
          animalId = a.id;
        }

        await db.insert(schema.animalTransactions).values({
          animalId, type: 'SALE', transactionDate: null,
          monthLabel: `${month} 2026`, notes: `Venda ${month} 2026 (brinco: ${rawTag})`,
        });
        saleCount++;
      }
    }
  }
  console.log(`  ✓ ${saleCount} vendas`);

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\n✅ Importação concluída!');
  console.log('   Pastos:', pastureMap.size);
  console.log('   Animais ativos:', insertedAnimals);

  await client.end();
}

main().catch((e) => {
  console.error('\n❌ Erro na importação:', e.message ?? e);
  process.exit(1);
});
