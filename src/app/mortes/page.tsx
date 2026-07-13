import { db } from '@/db';
import { animals, animalTransactions, pastures } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { Skull } from 'lucide-react';

export const dynamic = 'force-dynamic';

const CATEGORY_LABEL: Record<string, string> = {
  VACA: 'Vaca', BEZERRO: 'Bezerro', BEZERRA: 'Bezerra',
  TOURO: 'Touro', NOVILHA: 'Novilha', NOVILHO: 'Novilho',
  'BÚFALO': 'Búfalo', 'BÚFALA': 'Búfala',
};

export default async function MortesPage() {
  const deaths = await db
    .select({
      txId: animalTransactions.id,
      animalId: animals.id,
      tagNumber: animals.tagNumber,
      category: animals.category,
      transactionDate: animalTransactions.transactionDate,
      notes: animalTransactions.notes,
      fromPastureName: pastures.name,
    })
    .from(animalTransactions)
    .innerJoin(animals, eq(animals.id, animalTransactions.animalId))
    .leftJoin(pastures, eq(pastures.id, animalTransactions.fromPastureId))
    .where(eq(animalTransactions.type, 'DEATH'))
    .orderBy(desc(animalTransactions.transactionDate));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skull size={22} className="text-red-400" />
        <h2 className="text-2xl font-bold text-white">Mortes</h2>
        <span className="text-sm text-zinc-500 ml-1">{deaths.length} registro{deaths.length !== 1 ? 's' : ''}</span>
      </div>

      {deaths.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <Skull size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma morte registrada.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Brinco</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Data</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pasto de Origem</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {deaths.map((d) => (
                <tr key={d.txId} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/animals/${d.animalId}`} className="text-white hover:text-emerald-400 transition-colors font-medium">
                      {d.tagNumber ? `#${d.tagNumber}` : <span className="text-zinc-600">S/N</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {CATEGORY_LABEL[d.category] ?? d.category}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {d.transactionDate ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {d.fromPastureName ?? <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs max-w-xs truncate">
                    {d.notes ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
