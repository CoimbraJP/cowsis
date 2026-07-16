import { db } from '@/db';
import { pastures, animals } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { AuditoriaClient } from './AuditoriaClient';

export default async function AdmPage() {
  // Fetch all active pastures
  const allPastures = await db
    .select({ id: pastures.id, name: pastures.name })
    .from(pastures)
    .where(eq(pastures.active, true))
    .orderBy(pastures.name);

  // Fetch all active animals that have a pasture
  const allAnimals = await db
    .select({
      id: animals.id,
      tagNumber: animals.tagNumber,
      category: animals.category,
      currentPastureId: animals.currentPastureId,
    })
    .from(animals)
    .where(and(
      eq(animals.status, 'ACTIVE'),
    ))
    .orderBy(animals.tagNumber);

  // Build count per pasture
  const countMap: Record<number, number> = {};
  for (const a of allAnimals) {
    if (a.currentPastureId) {
      countMap[a.currentPastureId] = (countMap[a.currentPastureId] ?? 0) + 1;
    }
  }

  const pasturesWithCount = allPastures
    .map(p => ({ ...p, count: countMap[p.id] ?? 0 }))
    .filter(p => p.count > 0); // only show pastures that have animals

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">Auditoria de Pasto</h2>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium border border-amber-500/20">
            ADM
          </span>
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          Selecione um pasto e confirme quais animais estão presentes.
        </p>
      </div>

      <AuditoriaClient
        pastures={pasturesWithCount}
        animals={allAnimals.map(a => ({
          id: a.id,
          tagNumber: a.tagNumber,
          category: a.category,
          currentPastureId: a.currentPastureId,
        }))}
      />
    </div>
  );
}
