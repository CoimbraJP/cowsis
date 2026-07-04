import { db } from '@/db';
import { inseminations, animals, pastures } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import Link from 'next/link';
import { Syringe, Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING:   { label: 'Aguardando',  color: 'bg-amber-500/10 text-amber-400' },
  CONFIRMED: { label: 'Prenha',      color: 'bg-emerald-500/10 text-emerald-400' },
  FAILED:    { label: 'Não prenhou', color: 'bg-zinc-500/20 text-zinc-400' },   // P25
};

function getMonthOptions() {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    opts.push({ value, label });
  }
  return opts;
}

export default async function InsemsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const monthFilter  = sp.month  || '';
  const statusFilter = sp.status || '';

  const conditions = [];
  if (monthFilter)  conditions.push(sql`to_char(${inseminations.inseminationDate}, 'YYYY-MM') = ${monthFilter}`);
  if (statusFilter) conditions.push(eq(inseminations.status, statusFilter as any));

  const rows = await db
    .select({
      id:               inseminations.id,
      inseminationDate: inseminations.inseminationDate,
      bullSemen:        inseminations.bullSemen,
      status:           inseminations.status,
      paid:             inseminations.paid,
      observations:     inseminations.observations,
      animalId:         inseminations.animalId,
      tagNumber:        animals.tagNumber,
      category:         animals.category,
      pastureName:      pastures.name,
    })
    .from(inseminations)
    .leftJoin(animals, eq(inseminations.animalId, animals.id))
    .leftJoin(pastures, eq(animals.currentPastureId, pastures.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(inseminations.inseminationDate));

  const nTotal     = rows.length;
  const nPending   = rows.filter(r => r.status === 'PENDING').length;
  const nConfirmed = rows.filter(r => r.status === 'CONFIRMED').length;
  const nFailed    = rows.filter(r => r.status === 'FAILED').length;

  const monthOpts = getMonthOptions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Syringe className="h-8 w-8 text-purple-400" />
            Inseminacoes
          </h2>
          <p className="text-zinc-400 mt-1">{nTotal} registros</p>
        </div>
        <Link href="/inseminations/new"
          className="bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-medium">
          <Plus size={18} />
          Registrar inseminacao
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Total</p>
          <p className="text-2xl font-bold text-white mt-1 tabular-nums">{nTotal}</p>
        </div>
        <div className="rounded-xl border border-amber-900/30 bg-zinc-900/50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="text-xs text-amber-400 uppercase tracking-widest">Aguardando</p>
          <p className="text-2xl font-bold text-white mt-1 tabular-nums">{nPending}</p>
        </div>
        <div className="rounded-xl border border-emerald-900/30 bg-zinc-900/50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="text-xs text-emerald-400 uppercase tracking-widest">Prenhas</p>
          <p className="text-2xl font-bold text-white mt-1 tabular-nums">{nConfirmed}</p>
        </div>
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="text-xs text-zinc-400 uppercase tracking-widest">Nao prenhou</p>
          <p className="text-2xl font-bold text-white mt-1 tabular-nums">{nFailed}</p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3">
        <select name="month" defaultValue={monthFilter}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-500">
          <option value="">Todos os meses</option>
          {monthOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select name="status" defaultValue={statusFilter}
          className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-500">
          <option value="">Todos os status</option>
          <option value="PENDING">Aguardando</option>
          <option value="CONFIRMED">Prenha</option>
          <option value="FAILED">Nao prenhou</option>
        </select>
        <button type="submit"
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors">
          Filtrar
        </button>
        {(monthFilter || statusFilter) && (
          <Link href="/inseminations" className="px-4 py-2 text-zinc-400 hover:text-white rounded-lg transition-colors">
            Limpar
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs tracking-widest">
            <tr>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Animal</th>
              <th className="px-4 py-3 text-left">Pasto</th>
              <th className="px-4 py-3 text-left">Touro / Semen</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Pago</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                  Nenhuma inseminacao encontrada.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const cfg = STATUS_CONFIG[r.status ?? 'PENDING'];
              return (
                <tr key={r.id} className="group hover:bg-zinc-800/60 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <Link href={`/animals/${r.animalId}`} className="block inset-0 text-zinc-300 tabular-nums group-hover:text-white transition-colors">
                      {r.inseminationDate ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/animals/${r.animalId}`} className="block group-hover:text-purple-400 transition-colors">
                      <span className="font-mono text-white group-hover:text-purple-300">
                        {r.tagNumber ? `#${r.tagNumber}` : 'sem brinco'}
                      </span>
                      <span className="ml-2 text-xs text-zinc-500">{r.category}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/animals/${r.animalId}`} className="block text-zinc-400 text-xs group-hover:text-zinc-300 transition-colors">
                      {r.pastureName ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/animals/${r.animalId}`} className="block text-zinc-300 group-hover:text-white transition-colors">
                      {r.bullSemen ?? <span className="text-zinc-600 italic">—</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/animals/${r.animalId}`} className="block">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/animals/${r.animalId}`} className="block">
                      {r.paid
                        ? <span className="px-2 py-0.5 rounded text-xs bg-teal-500/10 text-teal-400">Pago</span>
                        : <span className="text-zinc-600 text-xs">—</span>}
                    </Link>
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
