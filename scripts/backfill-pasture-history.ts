/**
 * Backfill script: populate pasture_history from existing data
 *
 * Run AFTER `npx drizzle-kit push` with:
 *   npx tsx scripts/backfill-pasture-history.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, sql as drizzleSql } from 'drizzle-orm';
import * as schema from '../src/db/schema';

const { animals, animalTransactions, pastureHistory } = schema;

const client = postgres(process.env.DATABASE_URL!, { prepare: false, ssl: 'require' });
const db = drizzle(client, { schema });

async function main() {
  console.log('Starting pasture_history backfill...\n');

  // ── Diagnostics ────────────────────────────────────────────────────────────
  const allAnimals = await db.select().from(animals);
  const withPasture = allAnimals.filter(a => a.currentPastureId !== null);
  const noPasture   = allAnimals.filter(a => a.currentPastureId === null);

  const existingHist = await db
    .select({ count: drizzleSql<number>`count(*)` })
    .from(pastureHistory);
  const histCount = Number(existingHist[0]?.count ?? 0);

  const existingTransfers = await db
    .select({ count: drizzleSql<number>`count(*)` })
    .from(animalTransactions)
    .where(eq(animalTransactions.type, 'TRANSFER'));
  const transferCount = Number(existingTransfers[0]?.count ?? 0);

  console.log(`Animals total:             ${allAnimals.length}`);
  console.log(`  → with currentPastureId: ${withPasture.length}`);
  console.log(`  → without (no pasture):  ${noPasture.length}`);
  console.log(`TRANSFER records:          ${transferCount}`);
  console.log(`pasture_history entries:   ${histCount}`);
  console.log('');

  if (histCount > 0) {
    console.log(`ℹ️  pasture_history already has ${histCount} entries.`);
    console.log('   Skipping animals that already have entries.\n');
  }

  // ── Backfill ───────────────────────────────────────────────────────────────
  let created = 0;
  let skipped = 0;
  let noPassureSkipped = 0;

  for (const animal of allAnimals) {
    // Skip if already has history
    const existing = await db
      .select({ id: pastureHistory.id })
      .from(pastureHistory)
      .where(eq(pastureHistory.animalId, animal.id))
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    // Get TRANSFER transactions ordered by date
    const transfers = await db
      .select()
      .from(animalTransactions)
      .where(and(
        eq(animalTransactions.animalId, animal.id),
        eq(animalTransactions.type, 'TRANSFER'),
      ))
      .orderBy(animalTransactions.transactionDate, animalTransactions.id);

    if (transfers.length === 0) {
      if (!animal.currentPastureId) {
        noPassureSkipped++;
        continue; // No pasture and no transfers — nothing to record
      }
      // Simple case: animal has been in current pasture since beginning
      await db.insert(pastureHistory).values({
        animalId: animal.id,
        pastureId: animal.currentPastureId,
        enteredAt: '2024-01-01',
        exitedAt: null,
      });
      created++;
    } else {
      // Reconstruct chain from transfers
      const first = transfers[0];
      if (first.fromPastureId && first.transactionDate) {
        await db.insert(pastureHistory).values({
          animalId: animal.id,
          pastureId: first.fromPastureId,
          enteredAt: '2024-01-01',
          exitedAt: first.transactionDate,
        });
        created++;
      }
      for (let i = 0; i < transfers.length; i++) {
        const tx = transfers[i];
        const nextTx = transfers[i + 1];
        if (!tx.toPastureId || !tx.transactionDate) continue;
        await db.insert(pastureHistory).values({
          animalId: animal.id,
          pastureId: tx.toPastureId,
          enteredAt: tx.transactionDate,
          exitedAt: nextTx?.transactionDate ?? null,
        });
        created++;
      }
    }
  }

  console.log(`✓ Created:            ${created} pasture_history entries`);
  console.log(`  Skipped (existing): ${skipped}`);
  console.log(`  Skipped (no pasto): ${noPassureSkipped}`);

  const finalCount = await db
    .select({ count: drizzleSql<number>`count(*)` })
    .from(pastureHistory);
  console.log(`\nTotal entries now:    ${Number(finalCount[0]?.count ?? 0)}`);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
