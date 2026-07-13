import { db } from '@/db';
import { animals, countingItems, countingSessions, pastures } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle, ChevronDown } from 'lucide-react';
import { confirmAnimal, finishSession, moveAnimalSession } from '../actions';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const CATEGORY_LABEL: Record<string, string> = {
  VACA: 'Vaca', BEZERRO: 'Bezerro', BEZERRA: 'Bezerra',
  TOURO: 'Touro', NOVILHA: 'Novilha', NOVILHO: 'Novilho',
  'BÚFALO': 'Búfalo', 'BÚFALA': 'Búfala',
};

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = Number(id);

  const [session] = await db
    .select()
    .from(countingSessions)
    .where(eq(countingSessions.id, sessionId))
    .limit(1);

  if (!session) notFound();

  const isActive = session.status === 'ACTIVE';

  // Fetch all items with animal + snapshot pasture
  const items = await db
    .select({
      itemId: countingItems.id,
      itemStatus: countingItems.status,
      itemNotes: countingItems.notes,
      animalId: animals.id,
      tagNumber: animals.tagNumber,
      category: animals.category,
      currentPastureId: animals.currentPastureId,
      snapshotPastureId: countingItems.snapshotPastureId,
      resolvedPastureId: countingItems.resolvedPastureId,
    })
    .from(countingItems)
    .innerJoin(animals, eq(animals.id, countingItems.animalId))
    .where(eq(countingItems.sessionId, sessionId))
    .orderBy(animals.tagNumber);

  const allPastures = await db.select().from(pastures).orderBy(pastures.name);

  // Load pasture names map
  const pastureMap = new Map(allPastures.map((p) => [p.id, p.name]));

  // Group items by snapshot pasture
  const grouped = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.snapshotPastureId
      ? `${item.snapshotPastureId}:${pastureMap.get(item.snapshotPastureId) ?? 'Pasto'}`
      : '0:Sem Pasto';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  const total = items.length;
  const confirmed = items.filter((i) => i.itemStatus === 'CONFIRMED').length;
  const moved = items.filter((i) => i.itemStatus === 'MOVED').length;
  const untreated = items.filter((i) => i.itemStatus === 'UNTREATED').length;
  const pct = total > 0 ? Math.round(((confirmed + moved) / total) * 100) : 0;

  const faltantes = items.filter((i) => i.itemStatus === 'UNTREATED');

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/inventario" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{session.name}</h2>
          <p className="text-xs text-zinc-500">Iniciado em {session.startedAt}</p>
        </div>
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-700 text-zinc-400'
          }`}
        >
          {isActive ? 'ATIVA' : 'CONCLUÍDA'}
        </span>
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Progresso da contagem</span>
          <span className="text-white font-medium">{pct}% ({confirmed + moved}/{total})</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex gap-4 text-xs">
          <span className="text-emerald-400">✓ {confirmed} confirmados</span>
          <span className="text-blue-400">↗ {moved} movidos</span>
          <span className="text-red-400">? {untreated} sem tratar</span>
        </div>
      </div>

      {/* Finish button */}
      {isActive && (
        <form action={async () => { 'use server'; await finishSession(sessionId); }}>
          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            Finalizar Contagem
          </button>
        </form>
      )}

      {/* Animals grouped by pasture */}
      {Array.from(grouped.entries()).map(([key, groupItems]) => {
        const [, pastureName] = key.split(':');
        return (
          <div key={key} className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-1">
              {pastureName}
            </h3>
            <div className="rounded-xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800/60">
              {groupItems.map((item) => {
                const statusColor =
                  item.itemStatus === 'CONFIRMED'
                    ? 'text-emerald-400'
                    : item.itemStatus === 'MOVED'
                    ? 'text-blue-400'
                    : 'text-zinc-500';

                const statusIcon =
                  item.itemStatus === 'CONFIRMED' ? (
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  ) : item.itemStatus === 'MOVED' ? (
                    <span className="text-blue-400 text-xs font-bold">↗</span>
                  ) : (
                    <Clock size={14} className="text-zinc-600" />
                  );

                return (
                  <div key={item.itemId} className="px-4 py-3 bg-zinc-900/40 flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-3">
                      {statusIcon}
                      <div>
                        <span className="text-white text-sm font-medium">
                          {item.tagNumber ? `#${item.tagNumber}` : 'S/N'}
                        </span>
                        <span className="text-zinc-500 text-xs ml-2">
                          {CATEGORY_LABEL[item.category] ?? item.category}
                        </span>
                      </div>
                    </div>

                    {isActive && item.itemStatus === 'UNTREATED' && (
                      <div className="flex items-center gap-2">
                        {/* Confirm button */}
                        <form action={async () => { 'use server'; await confirmAnimal(sessionId, item.animalId); }}>
                          <button
                            type="submit"
                            className="text-xs bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            ✓ Confirmar
                          </button>
                        </form>

                        {/* Move inline */}
                        <details className="relative">
                          <summary className="cursor-pointer list-none text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                            Movido <ChevronDown size={12} />
                          </summary>
                          <div className="absolute right-0 top-8 z-10 bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl w-52 space-y-2">
                            <p className="text-xs text-zinc-400">Mover para qual pasto?</p>
                            <form action={async (fd: FormData) => {
                              'use server';
                              const pid = Number(fd.get('toPastureId'));
                              if (pid) await moveAnimalSession(sessionId, item.animalId, pid);
                            }}>
                              <select
                                name="toPastureId"
                                className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-xs focus:outline-none"
                              >
                                <option value="">Selecione…</option>
                                {allPastures.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="submit"
                                className="mt-2 w-full bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 text-xs py-1.5 rounded transition-colors"
                              >
                                Confirmar Mover
                              </button>
                            </form>
                          </div>
                        </details>
                      </div>
                    )}

                    {item.itemStatus === 'CONFIRMED' && (
                      <span className="text-xs text-emerald-600">Presente</span>
                    )}
                    {item.itemStatus === 'MOVED' && item.resolvedPastureId && (
                      <span className="text-xs text-blue-500">
                        → {pastureMap.get(item.resolvedPastureId) ?? '?'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Faltantes section (only shown when completed) */}
      {!isActive && faltantes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wider px-1 flex items-center gap-2">
            <AlertTriangle size={13} />
            Animais Faltantes ({faltantes.length})
          </h3>
          <div className="rounded-xl border border-red-900/40 overflow-hidden divide-y divide-red-900/20">
            {faltantes.map((item) => (
              <div key={item.itemId} className="px-4 py-3 bg-red-950/10 flex items-center gap-3">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                <div>
                  <span className="text-white text-sm font-medium">
                    {item.tagNumber ? `#${item.tagNumber}` : 'S/N'}
                  </span>
                  <span className="text-zinc-500 text-xs ml-2">
                    {CATEGORY_LABEL[item.category] ?? item.category}
                  </span>
                  {item.snapshotPastureId && (
                    <span className="text-zinc-600 text-xs ml-2">
                      — {pastureMap.get(item.snapshotPastureId)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isActive && faltantes.length === 0 && total > 0 && (
        <div className="rounded-xl border border-emerald-700/30 bg-emerald-950/20 p-4 text-center">
          <CheckCircle2 size={28} className="mx-auto mb-2 text-emerald-400" />
          <p className="text-sm text-emerald-300 font-medium">Todos os animais foram contados!</p>
        </div>
      )}
    </div>
  );
}
