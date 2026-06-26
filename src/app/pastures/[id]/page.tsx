import { db } from '@/db';
import { pastures, animals } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trees } from 'lucide-react';
import { moveAnimalToPasture } from '@/app/animals/actions';

export const dynamic = 'force-dynamic';

const CATEGORY_COLORS: Record<string, string> = {
  VACA:    'bg-blue-500/10 text-blue-400',
  BEZERRO: 'bg-amber-500/10 text-amber-400',
  BEZERRA: 'bg-yellow-500/10 text-yellow-400',
  TOURO:   'bg-red-500/10 text-red-400',
  NOVILHA: 'bg-purple-500/10 text-purple-400',
  NOVILHO: 'bg-pink-500/10 text-pink-400',
  'BÚFALO':'bg-teal-500/10 text-teal-400',
  'BÚFALA':'bg-cyan-500/10 text-cyan-400',
};

export default async function PastureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pastureId = Number(id);
  if (isNaN(pastureId)) notFound();

  const [pasture] = await db
    .select()
    .from(pastures)
    .where(eq(pastures.id, pastureId))
    .limit(1);

  if (!pasture) notFound();

  const pastureAnimals = await db
    .select()
    .from(animals)
    .where(eq(animals.currentPastureId, pastureId))
    .orderBy(animals.tagNumber);

  const allPastures = await db.select().from(pastures).orderBy(pastures.name);

  // Summary by category
  const summary: Record<string, number> = {};
  for (const a of pastureAnimals) {
    summary[a.category] = (summary[a.category] ?? 0) + 1;
  }

  const activeAnimals = pastureAnimals.filter(a => a.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/pastures" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <Trees className="h-7 w-7 text-emerald-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">{pasture.name}</h2>
          <p className="text-zinc-400 text-sm">{activeAnimals.length} animais ativos</p>
        </div>
      </div>

      {/* Summary cards */}
      {Object.keys(summary).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary).map(([cat, count]) => (
            <div key={cat} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${CATEGORY_COLORS[cat] ?? 'bg-zinc-700 text-zinc-300'}`}>
              {count}× {cat}
            </div>
          ))}
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
              <th className="px-4 py-3 text-left">Mover para pasto</th>
              <th className="px-4 py-3 text-right">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {pastureAnimals.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                  Nenhum animal neste pasto.
                </td>
              </tr>
            )}
            {pastureAnimals.map((animal) => (
              <tr key={animal.id} className="hover:bg-zinc-800/50 transition-colors">
                <td className="px-4 py-3 font-mono text-white">
                  {animal.tagNumber ?? <span className="text-zinc-500 italic">sem brinco</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[animal.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
                    {animal.category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    animal.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                    animal.status === 'SOLD' ? 'bg-zinc-500/10 text-zinc-400' :
                    'bg-red-900/20 text-red-500'
                  }`}>
                    {animal.status === 'ACTIVE' ? 'Ativo' : animal.status === 'SOLD' ? 'Vendido' : 'Morto'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <form
                    action={async (fd) => {
                      'use server';
                      const target = fd.get('targetPastureId');
                      await moveAnimalToPasture(animal.id, target ? Number(target) : null);
                    }}
                    className="flex items-center gap-2"
                  >
                    <select
                      name="targetPastureId"
                      defaultValue={pastureId}
                      className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">— Sem pasto —</option>
                      {allPastures.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded transition-colors"
                    >
                      Mover
                    </button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/animals/${animal.id}`}
                    className="text-zinc-400 hover:text-emerald-400 transition-colors text-xs px-2 py-1 rounded hover:bg-zinc-800"
                  >
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
