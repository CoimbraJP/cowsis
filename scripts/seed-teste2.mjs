/**
 * Adiciona 5 animais de cada categoria ao pasto "teste 2" (brincos 1001+)
 * Uso: node scripts/seed-teste2.mjs
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const postgres = require('postgres');

const url = process.env.DIRECT_URL;
if (!url) {
  console.error('DIRECT_URL não encontrado em .env.local');
  process.exit(1);
}
console.log('Conectando a:', url.replace(/:[^:@]+@/, ':***@'));

const sql = postgres(url, { prepare: false, ssl: 'require' });

const CATEGORIES = [
  'VACA', 'BEZERRO', 'BEZERRA', 'TOURO', 'NOVILHA', 'NOVILHO', 'BÚFALO', 'BÚFALA',
];

async function main() {
  const pastures = await sql`SELECT id, name FROM pastures`;
  const target = pastures.find(p => p.name.toLowerCase().includes('teste 2'));
  if (!target) {
    console.error('Pasto "teste 2" não encontrado. Pastos:', pastures.map(p => p.name).join(', '));
    process.exit(1);
  }
  console.log(`✓ Pasto: "${target.name}" (id ${target.id})`);

  const [maxTag] = await sql`SELECT COALESCE(MAX(CAST(tag_number AS INTEGER)), 1000) as max FROM animals WHERE tag_number ~ '^[0-9]+$'`;
  let tagCounter = Math.max(1001, Number(maxTag.max) + 1);
  console.log(`Brincos a partir de ${tagCounter}`);

  const rows = [];
  for (const category of CATEGORIES) {
    for (let i = 0; i < 5; i++) {
      rows.push({ tag: String(tagCounter++), category });
    }
  }

  for (const r of rows) {
    await sql`INSERT INTO animals (tag_number, category, status, current_pasture_id, is_pregnant) VALUES (${r.tag}, ${r.category}, 'ACTIVE', ${target.id}, false)`;
  }

  console.log(`✓ ${rows.length} animais inseridos (brincos ${rows[0].tag}–${rows[rows.length-1].tag})`);
  await sql.end();
}

main().catch(e => { console.error(e.message ?? e); process.exit(1); });
