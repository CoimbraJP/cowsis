import { db } from '@/db';
import { animals, pastures } from '@/db/schema';
import { eq, ilike, and, asc, desc, SQL } from 'drizzle-orm';
import Link from 'next/link';
import { Beef, Plus, Search, ArrowUpDown } from 'lucide-react';

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
  ACTIVE: 'Ativo',
  SOLD:   'Vendido',
  DEAD:   'Morto',
};

// Sort helper: builds a URL with the new sort param, preserving other params
function sortLink(
  current: Record<string, string>,
  sortKey: string,
  currentSort: string,
): string {
  const params = new URLSearchParams(
    Object.entries(current).filter(([, v]) => v)
  );
  // Toggle direction if same key
  if (currentSort === sortKey) {
    params.set('sort', `${sortKey}_desc`);
  } else if (currentSort === `${sortKey}_desc`) {
    params.set('sort', sortKey);
  } else {
    params.set('sort', sortKey);
  }
  return `/animals?${params.toString()}`;
}

function sortIcon(currentSort: string, key: string) {
  if (currentSort === key) return ' ↑';
  if (currentSort === `${key}_desc`) return ' ↓';
  return '';
}

export default async function AnimalsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const query          = sp.q?.trim() || '';
  const statusFilter   = sp.status || '';
  const categoryFilter = sp.category || '';
  const sortParam      = sp.sort || 'tag';   // default: brinco 0→9

  // Build WHERE conditions
  const conditions: SQL[] = [];
  if (query)          conditions.push(ilike(animals.tagNumber, `%${query}%`));
  if (statusFilter)   conditions.push(eq(animals.status, statusFilter as any));
  if (categoryFilter) conditions.push(eq(animals.category, categoryFilter as any));

  // Build ORDER BY
  let orderBy: SQL;
  switch (sortParam) {
    case 'tag_desc':    orderBy = desc(animals.tagNumber);  break;
    case 'pasture':     orderBy = asc(pastures.name);       break;
    case 'pasture_desc':orderBy = desc(pastures.name);      break;
    default:            orderBy = asc(animals.tagNumber);   break; // 'tag' or unknown
  }

  const allAnimals = await db
    .select({
      id:          animals.id,
      tagNumber:   animals.tagNumber,
      category:    animals.category,
      status:      animals.status,
      pastureName: pastures.name,
      pastureId:   animals.currentPastureId,
    })
    .from(animals)
    .leftJoin(pastures, eq(animals.currentPastureId, pastures.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderBy);

  const totalActive = allAnimals.filter(a => a.status === 'ACTIVE').length;
  const totalSold   = allAnimals.filter(a => a.status === 'SOLD').length;
  const totalDead   = allAnimals.filter(a => a.status === 'DEAD').length;

  // Params for sort links (excluding 'sort' itself)
  const baseParams: Record<string, string> = {};
  if (query)          baseParams.q = query;
  if (statusFilter)   baseParams.status = statusFilter;
  if (categoryFilter) baseParams.category = categoryFilter;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Beef className="h-8 w-8 text-emerald-400" />
            Animais
          </h2>
          <p className="text-zinc-400 mt-1">{allAnimals.length} encontrados</p>
        </div>
        <Link
          href="/animals/new"
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
        >
          <Plus size={18} />
          Novo Animal
        </Link>
      </div>

      {/* Stat pills */}
      <div className="flex gap-3 flex-wrap">
        <span className="px-3 py-1 rounded-full text-sm bg-emerald-500/10 text-emerald-400">{totalActive} ativos</span>
        <span className="px-3 py-1 rounded-full text-sm bg-zinc-500/10 text-zinc-400">{totalSold} vendidos</span>
        <span className="px-3 py-1 rounded-full text-sm bg-red-900/20 text-red-500">{totalDead} mortos</span>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        {/* Keep sort param when filtering */}
        {sortParam && <input type="hidden" name="sort" value={sortParam} />}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar por brinco..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select
          name="status"
          defaultValue={statusFilter}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
        >
          <option value="">Todos os status</option>
          <option value="ACTIVE">Ativo</option>
          <option value="SOLD">Vendido</option>
          <option value="DEAD">Morto</option>
        </select>
        <select
          name="category"
          defaultValue={categoryFilter}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
        >
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
        <button
          type="submit"
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
        >
          Filtrar
        </button>
        {(query || statusFilter || categoryFilter) && (
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
              {/* Sortable: Brinco */}
              <th className="px-4 py-3 text-left">
                <Link
                  href={sortLink(baseParams, 'tag', sortParam)}
                  className="flex items-center gap-1 hover:text-white transition-colors group"
                >
                  Brinco
                  <ArrowUpDown size={12} className="opacity-50 group-hover:opacity-100" />
                  <span className="text-emerald-400">{sortIcon(sortParam, 'tag')}</span>
                </Link>
              </th>
              <th className="px-4 py-3 text-left">Categoria</th>
              {/* Sortable: Pasto */}
              <th className="px-4 py-3 text-left">
                <Link
                  href={sortLink(baseParams, 'pasture', sortParam)}
                  className="flex items-center gap-1 hover:text-white transition-colors group"
                >
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
            {allAnimals.map((animal) => (
              <tr key={animal.id} className="hover:bg-zinc-800/50 transition-colors">
                <td className="px-4 py-3 font-mono text-white">
                  {animal.tagNumber ?? <span className="text-zinc-500 italic">sem brinco</span>}
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
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/animals/${animal.id}`}
                    className="text-zinc-400 hover:text-emerald-400 transition-colors text-xs px-2 py-1 rounded hover:bg-zinc-800"
                  >
                    Editar
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
