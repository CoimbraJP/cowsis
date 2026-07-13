import { db } from '@/db';
import { animals, countingItems, countingSessions, pastures } from '@/db/schema';
import { eq, ilike, and, asc, desc, sql, SQL } from 'drizzle-orm';
import Link from 'next/link';
import { Beef, Plus, Search, ArrowUpDown, ClipboardList, ChevronDown } from 'lucide-react';
import { confirmAnimal, moveAnimalSession } from '../inventario/actions';
import { moveAnimalToPasture } from './actions';

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
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-400',
  SOLD:   'bg-zinc-500/10 text-zinc-400',
  DEAD:   'bg-red-900/20 text-red-500',
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo', SOLD: 'Vendido', DEAD: 'Morto',
};

function sortLink(current: Record<string, string>, sortKey: string, currentSort: string): string {
  const params = new URLSearchParams(Object.entries(current).filter(([, v]) => v));
  if (currentSort === sortKey) params.set('sort', `${sortKey}_desc`);
  else if (currentSort === `${sortKey}_desc`) params.set('sort', sortKey);
  else params.set('sort', sortKey);
  return `/animals?${params.toString()}`;
}
function sortIcon(s: string, k: string) {
  if (s === k) return ' ↑';
  if (s === `${k}_desc`) return ' ↓';
  return '';
}

export default async function AnimalsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string; sort?: string; pregnant?: string; bezerros?: string; pastureId?: string }>;
}) {
  const sp = await searchParams;
  const query          = sp.q?.trim() || '';
  const statusFilter   = sp.status || '';
  const categoryFilter = sp.category || '';
  const sortParam      = sp.sort || 'tag';
  const pregnantOnly   = sp.pregnant === '1';
  const pastureFilter  = sp.pastureId || '';
  const bezerrosMode   = sp.bezerros === '1';

  const conditions: SQL[] = [];
  if (query)          conditions.push(ilike(animals.tagNumber, `%${query}%`));
  if (statusFilter)   conditions.push(eq(animals.status, statusFilter as any));
  if (categoryFilter) conditions.push(eq(animals.category, categoryFilter as any));
  if (bezerrosMode)   conditions.push(sql`${animals.category} IN ('BEZERRO', 'BEZERRA')`);
  if (pregnantOnly)   conditions.push(eq(animals.isPregnant, true));
  if (pastureFilter)  conditions.push(eq(animals.currentPastureId, Number(pastureFilter)));

  // P14: Numeric sort for tag numbers
  const numericTagAsc  = sql`(CASE WHEN animals.tag_number ~ '^[0-9]+$' THEN animals.tag_number::integer ELSE NULL END) ASC NULLS LAST, animals.tag_number ASC`;
  const numericTagDesc = sql`(CASE WHEN animals.tag_number ~ '^[0-9]+$' THEN animals.tag_number::integer ELSE NULL END) DESC NULLS LAST, animals.tag_number DESC`;

  let orderBy: SQL;
  switch (sortParam) {
    case 'tag_desc':     orderBy = numericTagDesc;     break;
    case 'pasture':      orderBy = asc(pastures.name); break;
    case 'pasture_desc': orderBy = desc(pastures.name);break;
    default:             orderBy = numericTagAsc;      break;
  }

  const [allAnimals, allPastures, activeSessions] = await Promise.all([
    db
      .select({
        id:          animals.id,
        tagNumber:   animals.tagNumber,
        category:    animals.category,
        status:      animals.status,
        isPregnant:  animals.isPregnant,
        pastureName: pastures.name,
        pastureId:   animals.currentPastureId,
      })
      .from(animals)
      .leftJoin(pastures, eq(animals.currentPastureId, pastures.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(orderBy),
    db.select().from(pastures).orderBy(pastures.name),
    db
      .select({ id: countingSessions.id, name: countingSessions.name })
      .from(countingSessions)
      .where(eq(countingSessions.status, 'ACTIVE'))
      .limit(1),
  ]);

  const activeSession = activeSessions[0] ?? null;

  // If active session, fetch which animal IDs are already confirmed/moved in that session
  let sessionItemStatusMap = new Map<number, string>();
  if (activeSession) {
    const sessionItems = await db
      .select({ animalId: countingItems.animalId, status: countingItems.status })
      .from(countingItems)
      .where(eq(countingItems.sessionId, activeSession.id));
    for (const si of sessionItems) {
      sessionItemStatusMap.set(si.animalId, si.status);
    }
  }

  const totalActive   = allAnimals.filter(a => a.status === 'ACTIVE').length;
  const totalSold     = allAnimals.filter(a => a.status === 'SOLD').length;
  const totalDead     = allAnimals.filter(a => a.status === 'DEAD').length;
  const totalPregnant = allAnimals.filter(a => a.isPregnant).length;

  const baseParams: Record<string, string> = {};
  if (query)          baseParams.q = query;
  if (statusFilter)   baseParams.status = statusFilter;
  if (categoryFilter) baseParams.category = categoryFilter;
  if (pregnantOnly)   baseParams.pregnant = '1';
  if (pastureFilter)  baseParams.pastureId = pastureFilter;

  return (
    <div className="space-y-6">
      {/* Active session banner */}
      {activeSession && (
        <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <ClipboardList size={16} className="text-emerald-400" />
            <span className="text-emerald-300">Contagem ativa:</span>
            <span className="text-white font-medium">{activeSession.name}</span>
          </div>
          <Link href={`/inventario/${activeSession.id}`} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
            Ver contagem →
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Beef className="h-8 w-8 text-emerald-400" />
            Animais
          </h2>
          <p className="text-zinc-400 mt-1">{allAnimals.length} encontrados</p>
        </div>
        <Link href="/animals/new"
          className="bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-medium">
          <Plus size={18} />
          Novo Animal
        </Link>
      </div>

      {/* Stat pills */}
      <div className="flex gap-3 flex-wrap">
        <span className="px-3 py-1 rounded-full text-sm bg-emerald-500/10 text-emerald-400">{totalActive} ativos</span>
        <span className="px-3 py-1 rounded-full text-sm bg-zinc-500/10 text-zinc-400">{totalSold} vendidos</span>
        <span className="px-3 py-1 rounded-full text-sm bg-red-900/20 text-red-500">{totalDead} mortos</span>
        {totalPregnant > 0 && (
          <Link
            href={`/animals?pregnant=1${categoryFilter ? `&category=${categoryFilter}` : ''}${statusFilter ? `&status=${statusFilter}` : ''}`}
            className="px-3 py-1 rounded-full text-sm bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 transition-colors">
            🤰 {totalPregnant} prenhas
          </Link>
        )}
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 items-center">
        {sortParam && <input type="hidden" name="sort" value={sortParam} />}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input name="q" defaultValue={query} placeholder="Buscar por brinco..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500" />
        </div>
        <select name="status" defaultValue={statusFilter}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500">
          <option value="">Todos os status</option>
          <option value="ACTIVE">Ativo</option>
          <option value="SOLD">Vendido</option>
          <option value="DEAD">Morto</option>
        </select>
        <select name="category" defaultValue={categoryFilter}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500">
          <option value="">Todas as categorias</option>
          <option value="VACA">Vaca</option>
          <option value="BEZERRO">Bezerro</option>
          <option value="BEZERRA">Bezerra</option>
          <option value="TOURO">Touro</option>
          <option value="NOVILHA">Novilha</option>
          <option value="NOVILHO">Novilho</option>
          <option value="BÚFALO">Búfalo</option>
          <option value="BÚFALA">Búfala</option>
        </select>
        <select name="pastureId" defaultValue={pastureFilter}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500">
          <option value="">Todos os pastos</option>
          {allPastures.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer select-none px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-pink-500/50 transition-colors">
          <input type="checkbox" name="pregnant" value="1" defaultChecked={pregnantOnly}
            className="accent-pink-500 w-4 h-4 rounded" />
          Apenas prenhas
        </label>
        <button type="submit"
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors">
          Filtrar
        </button>
        {(query || statusFilter || categoryFilter || pregnantOnly || pastureFilter) && (
          <Link href="/animals" className="px-4 py-2 text-zinc-400 hover:text-white rounded-lg transition-colors">
            Limpar
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">
                <Link href={sortLink(baseParams, 'tag', sortParam)}
                  className="flex items-center gap-1 hover:text-white transition-colors group">
                  Brinco
                  <ArrowUpDown size={12} className="opacity-50 group-hover:opacity-100" />
                  <span className="text-emerald-400">{sortIcon(sortParam, 'tag')}</span>
                </Link>
              </th>
              <th className="px-4 py-3 text-left">Categoria</th>
              <th className="px-4 py-3 text-left">
                <Link href={sortLink(baseParams, 'pasture', sortParam)}
                  className="flex items-center gap-1 hover:text-white transition-colors group">
                  Pasto
                  <ArrowUpDown size={12} className="opacity-50 group-hover:opacity-100" />
                  <span className="text-emerald-400">{sortIcon(sortParam, 'pasture')}</span>
                </Link>
              </th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {allAnimals.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-zinc-500">
                  Nenhum animal encontrado.
                </td>
              </tr>
            )}
            {allAnimals.map((animal) => {
              const sessionStatus = sessionItemStatusMap.get(animal.id);
              const needsConfirm = activeSession && animal.status === 'ACTIVE' && sessionStatus === 'UNTREATED';

              return (
                <tr key={animal.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono">
                    <span className="flex items-center gap-2">
                      <span className={animal.tagNumber ? 'text-white' : 'text-zinc-500 italic'}>
                        {animal.tagNumber ?? 'sem brinco'}
                      </span>
                      {animal.isPregnant && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-pink-500/15 text-pink-400 rounded-full border border-pink-500/20">
                          🤰 Prenha
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[animal.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
                      {animal.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {animal.pastureName ? (
                      <Link href={`/pastures/${animal.pastureId}`} className="hover:text-emerald-400 transition-colors">
                        {animal.pastureName}
                      </Link>
                    ) : (
                      <span className="text-zinc-500 italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[animal.status]}`}>
                      {STATUS_LABELS[animal.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {/* Confirm button (active session + untreated) */}
                      {needsConfirm && activeSession && (
                        <form action={async () => {
                          'use server';
                          await confirmAnimal(activeSession.id, animal.id);
                        }}>
                          <button
                            type="submit"
                            className="text-[11px] bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 px-2 py-1 rounded transition-colors"
                          >
                            ✓ OK
                          </button>
                        </form>
                      )}

                      {/* Inline move */}
                      {animal.status === 'ACTIVE' && (
                        <details className="relative">
                          <summary className="cursor-pointer list-none text-[11px] bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-2 py-1 rounded transition-colors flex items-center gap-1">
                            Mover <ChevronDown size={11} />
                          </summary>
                          <div className="absolute right-0 top-7 z-20 bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl w-48 space-y-2">
                            <p className="text-xs text-zinc-400">Mover para:</p>
                            <form action={async (fd: FormData) => {
                              'use server';
                              const pid = Number(fd.get('toPastureId'));
                              const sid = activeSession?.id ?? null;
                              if (pid) {
                                await moveAnimalToPasture(animal.id, animal.pastureId ?? null, pid, null);
                                if (sid) await moveAnimalSession(sid, animal.id, pid);
                              }
                            }}>
                              <select
                                name="toPastureId"
                                className="w-full px-2 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-white text-xs focus:outline-none"
                              >
                                <option value="">Selecione…</option>
                                {allPastures
                                  .filter((p) => p.id !== animal.pastureId)
                                  .map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))}
                              </select>
                              <button
                                type="submit"
                                className="mt-2 w-full bg-zinc-700 hover:bg-zinc-600 text-white text-xs py-1.5 rounded transition-colors"
                              >
                                Confirmar
                              </button>
                            </form>
                          </div>
                        </details>
                      )}

                      <Link href={`/animals/${animal.id}`}
                        className="text-zinc-400 hover:text-emerald-400 transition-colors text-xs px-2 py-1 rounded hover:bg-zinc-800">
                        Editar
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
