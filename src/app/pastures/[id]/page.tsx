import { db } from '@/db';
import { pastures, animals, pastureHistory } from '@/db/schema';
import { eq, and, lte, or, isNull, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trees, Clock, Plus } from 'lucide-react';
import { moveAnimalToPasture } from '@/app/animals/actions';
import { DeletePastureButton } from './DeletePastureButton';
import { EditPastureButton } from './EditPastureButton';

export const dynamic = 'force-dynamic';

const CATEGORY_COLORS: Record<string, string> = {
  VACA:     'bg-blue-500/10 text-blue-400',
  BEZERRO:  'bg-amber-500/10 text-amber-400',
  BEZERRA:  'bg-yellow-500/10 text-yellow-400',
  TOURO:    'bg-red-500/10 text-red-400',
  NOVILHA:  'bg-purple-500/10 text-purple-400',
  NOVILHO:  'bg-pink-500/10 text-pink-400',
  'BÚFALO': 'bg-teal-500/10 text-teal-400',
  'BÚFALA': 'bg-cyan-500/10 text-cyan-400',
};

function lastDayOfMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0);
  return last.toISOString().split('T')[0];
}

export default async function PastureDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const pastureId = Number(id);
  if (isNaN(pastureId)) notFound();

  const [pasture] = await db.select().from(pastures).where(eq(pastures.id, pastureId)).limit(1);
  if (!pasture) notFound();

  const periodFilter = sp.period || '';
  const isHistorical = !!periodFilter;
  const today = new Date().toISOString().split('T')[0];

  let pastureAnimals: Array<{ id: number; tagNumber: string | null; category: string; status: string; isPregnant?: boolean | null }> = [];

  if (isHistorical) {
    const asOfDate = lastDayOfMonth(periodFilter);
    const rows = await db
      .select({ id: animals.id, tagNumber: animals.tagNumber, category: animals.category, status: animals.status, isPregnant: animals.isPregnant })
      .from(pastureHistory)
      .innerJoin(animals, eq(pastureHistory.animalId, animals.id))
      .where(and(
        eq(pastureHistory.pastureId, pastureId),
        lte(pastureHistory.enteredAt, asOfDate),
        or(isNull(pastureHistory.exitedAt), sql`${pastureHistory.exitedAt} > ${asOfDate}`)
      ))
      .orderBy(animals.tagNumber);
    pastureAnimals = rows as any;
  } else {
    const rows = await db
      .select({ id: animals.id, tagNumber: animals.tagNumber, category: animals.category, status: animals.status, isPregnant: animals.isPregnant })
      .from(animals)
      .where(eq(animals.currentPastureId, pastureId))
      .orderBy(animals.tagNumber);
    pastureAnimals = rows as any;
  }

  const allPastures = await db.select().from(pastures).orderBy(pastures.name);

  const summary: Record<string, number> = {};
  for (const a of pastureAnimals) summary[a.category] = (summary[a.category] ?? 0) + 1;

  const historyMonths = await db
    .selectDistinct({ month: sql<string>`to_char(${pastureHistory.enteredAt}, 'YYYY-MM')` })
    .from(pastureHistory)
    .where(eq(pastureHistory.pastureId, pastureId))
    .orderBy(sql`1 desc`)
    .limit(12);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/pastures" className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <Trees className="h-7 w-7 text-emerald-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">{pasture.name}</h2>
            <p className="text-zinc-400 text-sm">
              {isHistorical
                ? `${pastureAnimals.length} animais em ${periodFilter}`
                : `${pastureAnimals.filter(a => a.status === 'ACTIVE').length} animais ativos`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EditPastureButton id={pastureId} currentName={pasture.name} />
          <DeletePastureButton id={pastureId} />
          <Link
            href={`/animals/new?pastureId=${pastureId}`}
            className="bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-medium text-sm"
          >
            <Plus size={16} />
            Novo Animal
          </Link>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <Clock size={16} className="text-zinc-500" />
        <span className="text-sm text-zinc-400">Composição em:</span>
        <Link href={`/pastures/${pastureId}`}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${!isHistorical ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
          Hoje
        </Link>
        {historyMonths.map(({ month }) => (
          <Link key={month} href={`/pastures/${pastureId}?period=${month}`}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${periodFilter === month ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
            {month}
          </Link>
        ))}
      </div>

      {/* Category summary */}
      {Object.keys(summary).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary).map(([cat, count]) => (
            <div key={cat} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${CATEGORY_COLORS[cat] ?? 'bg-zinc-700 text-zinc-300'}`}>
              {count}× {cat}
            </div>
          ))}
        </div>
      )}

      {isHistorical && (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2 text-amber-400 text-sm">
          Visão histórica: composição ao final de {periodFilter}.
        </div>
      )}

      {/* Animal list */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">Brinco</th>
              <th className="px-4 py-3 text-left">Categoria</th>
              <th className="px-4 py-3 text-left">Status</th>
              {!isHistorical && <th className="px-4 py-3 text-left w-80">Mover para pasto</th>}
              <th className="px-4 py-3 text-right">Ver</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {pastureAnimals.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                  {isHistorical ? `Nenhum animal neste pasto em ${periodFilter}.` : 'Nenhum animal neste pasto.'}
                </td>
              </tr>
            )}
            {pastureAnimals.map((animal) => (
              <tr key={animal.id} className="hover:bg-zinc-800/50 transition-colors">
                <td className="px-4 py-3 font-mono text-white font-semibold">
                  {animal.tagNumber ?? <span className="text-zinc-500 italic font-normal">sem brinco</span>}
                  {animal.isPregnant && <span className="ml-2 text-[10px] bg-pink-500/10 text-pink-400 px-1.5 py-0.5 rounded font-normal">PRENHA</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[animal.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
                    {animal.category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    animal.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                    animal.status === 'SOLD'   ? 'bg-zinc-500/10 text-zinc-400' :
                                                 'bg-red-900/20 text-red-500'
                  }`}>
                    {animal.status === 'ACTIVE' ? 'Ativo' : animal.status === 'SOLD' ? 'Vendido' : 'Morto'}
                  </span>
                </td>
                {!isHistorical && (
                  <td className="px-4 py-3">
                    <form action={async (fd: FormData) => {
                      'use server';
                      const targetId = fd.get('targetPastureId');
                      const moveDate = fd.get('moveDate') as string | null;
                      await moveAnimalToPasture(animal.id, pastureId, targetId ? Number(targetId) : null, moveDate);
                    }} className="flex items-center gap-2 flex-wrap">
                      <select name="targetPastureId" defaultValue={pastureId}
                        className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-emerald-500">
                        <option value="">— Sem pasto —</option>
                        {allPastures.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input type="date" name="moveDate" defaultValue={today}
                        className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-emerald-500" />
                      <button type="submit"
                        className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded transition-colors font-medium">
                        Mover
                      </button>
                    </form>
                  </td>
                )}
                <td className="px-4 py-3 text-right">
                  <Link href={`/animals/${animal.id}`}
                    className="text-zinc-400 hover:text-emerald-400 transition-colors text-xs px-2 py-1 rounded hover:bg-zinc-800">
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
