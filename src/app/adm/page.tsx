import { db } from '@/db';
import { pastures, animals } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ManejoClient } from './ManejoClient';

export const dynamic = 'force-dynamic';

export default async function AdmPage() {
  const allPastures = await db
    .select({ id: pastures.id, name: pastures.name })
    .from(pastures)
    .where(eq(pastures.active, true))
    .orderBy(pastures.name);

  const allAnimals = await db
    .select({
      id: animals.id,
      tagNumber: animals.tagNumber,
      category: animals.category,
      currentPastureId: animals.currentPastureId,
    })
    .from(animals)
    .where(eq(animals.status, 'ACTIVE'))
    .orderBy(animals.tagNumber);

  const countMap: Record<number, number> = {};
  for (const a of allAnimals) {
    if (a.currentPastureId) {
      countMap[a.currentPastureId] = (countMap[a.currentPastureId] ?? 0) + 1;
    }
  }

  const pasturesWithCount = allPastures
    .map(p => ({ ...p, count: countMap[p.id] ?? 0 }))
    .filter(p => p.count > 0);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">Auditoria</h2>
          <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
            DEMO
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Trabalhe com vários animais de uma vez: confira o pasto, registre vacinação ou movimente lotes inteiros.
        </p>
      </div>

      <div className="flex items-center gap-2.5 rounded-xl border border-zinc-800/60 bg-zinc-900/60 px-4 py-2.5 text-xs text-zinc-400">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        <span>
          <b className="font-semibold text-emerald-400">PRÉVIA VISUAL</b>
          {' · '}
          Módulo 3 — Auditoria de Pasto. Você pode navegar e testar a seleção normalmente, mas a confirmação ainda não grava no banco de dados.
        </span>
      </div>

      <ManejoClient
        pastures={pasturesWithCount}
        allPastures={allPastures}
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
