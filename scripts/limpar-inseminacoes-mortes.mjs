import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Lê o .env.local
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, '..', '.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^"|"$/g, '')]; })
);

const sql = postgres(env.DATABASE_URL, { ssl: 'require', prepare: false });

async function run() {
  console.log('Iniciando limpeza...\n');

  // 1. Deletar todas as inseminações
  const ins = await sql`DELETE FROM inseminations RETURNING id`;
  console.log(`✅ Inseminações deletadas: ${ins.length}`);

  // 2. Zerar isPregnant em todos os animais
  const preg = await sql`UPDATE animals SET is_pregnant = false WHERE is_pregnant = true RETURNING id`;
  console.log(`✅ Animais com prenhez zerada: ${preg.length}`);

  // 3. Buscar IDs dos animais MORTOS
  const deadAnimals = await sql`SELECT id FROM animals WHERE status = 'DEAD'`;
  const deadIds = deadAnimals.map(a => a.id);
  console.log(`🔍 Animais mortos encontrados: ${deadIds.length}`);

  if (deadIds.length > 0) {
    // 4. Apagar todos os registros relacionados aos animais mortos
    const txDel = await sql`DELETE FROM animal_transactions WHERE animal_id = ANY(${deadIds}) RETURNING id`;
    console.log(`✅ Transações deletadas: ${txDel.length}`);

    const histDel = await sql`DELETE FROM pasture_history WHERE animal_id = ANY(${deadIds}) RETURNING id`;
    console.log(`✅ Histórico de pasto deletado: ${histDel.length}`);

    const birthDel = await sql`DELETE FROM births WHERE mother_id = ANY(${deadIds}) RETURNING id`;
    console.log(`✅ Partos deletados: ${birthDel.length}`);

    // 5. Deletar os animais mortos permanentemente
    const animalDel = await sql`DELETE FROM animals WHERE id = ANY(${deadIds}) RETURNING id`;
    console.log(`✅ Animais mortos excluídos permanentemente: ${animalDel.length}`);
  }

  await sql.end();
  console.log('\n🎉 Limpeza concluída!');
  console.log('Inseminações e animais mortos foram removidos permanentemente.');
}

run().catch(e => {
  console.error('Erro:', e.message);
  process.exit(1);
});
