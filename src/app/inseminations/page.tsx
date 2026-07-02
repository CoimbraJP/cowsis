import { db } from '@/db';
import { inseminations, animals, pastures } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import Link from 'next/link';
import { Syringe } from 'lucide-react';
import { addInsemination, updateInsemination } from '@/app/animals/actions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

const STATUS_CONFIG = {
  PENDING:   { label: 'Aguardando', color: 'bg-amber-500/10 text-amber-400' },
  CONFIRMED: { label: 'Prenha',     color: 'bg-emerald-500/10 text-emerald-400' },
  FAILED:    { label: 'Vazia',      color: 'bg-red-500/10 text-red-400' },
};

// Generate month options for the last 24 months
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
  const monthFilter = sp.month || '';
  const statusFilter = sp.status || '';

  const allAnimals = await db
    .select({ id: animals.id, tagNumber: animals.tagNumber, category: animals.category, pastureName: pastures.name })
    .from(animals)
    .leftJoin(pastures, eq(animals.currentPastureId, pastures.id))
    .where(eq(animals.status, 'ACTIVE'))
    .orderBy(animals.tagNumber);

  // Build conditions
  const conditions = [];
  if (monthFilter) {
    conditions.push(sql`to_char(${inseminations.inseminationDate}, 'YYYY-MM') = ${monthFilter}`);
  }
  if (statusFilter) {
    conditions.push(eq(inseminations.status, statusFilter as any));
  }

  const rows = await db
    .select({
      id: inseminations.id,
      inseminationDate: inseminations.inseminationDate,
      bullSemen: inseminations.bullSemen,
      status: inseminations.status,
      paid: inseminations.paid,
      observations: inseminations.observations,
      animalId: inseminations.animalId,
      tagNumber: animals.tagNumber,
      category: animals.category,
      pastureName: pastures.name,
    })
    .from(inseminations)
    .leftJoin(animals, eq(inseminations.animalId, animals.id))
    .leftJoin(pastures, eq(animals.currentPastureId, pastures.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(inseminations.inseminationDate));

  const counts = {
    total: rows.length,
    PENDING: rows.filter(r => r.status === 'PENDING').length,
    CONFIRMED: rows.filter(r => r.status === 'CONFIRMED').length,
    FAILED: rows.filter(r => r.status === 'FAILED').length,
    paid: rows.filter(r => r.paid).length,
  };

  const monthOpts = getMonthOptions();
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Syringe className="h-8 w-8 text-purple-400" />
            Inseminações
          </h2>
          <p className="text-zinc-400 mt-1">{rows.length} registros</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold text-white mt-1">{counts.total}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-amber-400 uppercase tracking-wider">Aguardando</p>
          <p className="text-2xl font-bold text-white mt-1">{counts.PENDING}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-emerald-400 uppercase tracking-wider">Prenhas</p>
          <p className="text-2xl font-bold text-white mt-1">{counts.CONFIRMED}</p>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-xs text-red-400 uppercase tracking-wider">Vazias</p>
          <p className="text-2xl font-bold text-white mt-1">{counts.FAILED}</p>
        </div>
      </div>

      {/* Add insemination form */}
      <details className="rounded-xl border border-zinc-800 bg-zinc-900/50">
        <summary className="px-6 py-4 cursor-pointer text-white font-semibold hover:text-emerald-400 transition-colors">
          + Registrar nova inseminação
        </summary>
        <form action={addInsemination} className="px-6 pb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm text-zinc-400">Animal *</label>
              <select name="animalId" required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-500">
                <option value="">Selecione o animal</option>
                {allAnimals.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.tagNumber ? `#${a.tagNumber}` : 'sem brinco'} — {a.category} {a.pastureName ? `(${a.pastureName})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-zinc-400">Data *</label>
              <input type="date" name="inseminationDate" defaultValue={today} required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-zinc-400">Touro / Sêmen</label>
              <input type="text" name="bullSemen" placeholder="Ex: Nelore 300"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500" />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-zinc-400">Status</label>
              <select name="status"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-500">
                <option value="PENDING">Aguardando resultado</option>
                <option value="CONFIRMED">Prenha confirmada</option>
                <option value="FAILED">Não prenhou</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-zinc-400">Observações</label>
              <input type="text" name="observations" placeholder="Observações opcionais"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500" />
            </div>
            <div className="space-y-1 flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="hidden" name="paid" value="false" />
                <input type="checkbox" name="paid" value="true"
                  className="w-4 h-4 accent-purple-500" />
                <span className="text-sm text-zinc-400">Serviço pago</span>
              </label>
            </div>
          </div>
          <button type="submit"
            className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors">
            Registrar
          </button>
        </form>
      </details>

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
          <option value="FAILED">Vazia</option>
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
          <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Animal</th>
              <th className="px-4 py-3 text-left">Pasto</th>
              <th className="px-4 py-3 text-left">Touro/Sêmen</th>
              <th className="px-4 py-3 text-left">Resultado</th>
              <th className="px-4 py-3 text-left">Pagamento</th>
              <th className="px-4 py-3 text-left">Obs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                  Nenhuma inseminação encontrada.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const cfg = STATUS_CONFIG[r.status ?? 'PENDING'];
              return (
                <tr key={r.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">{r.inseminationDate ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Link href={`/animals/${r.animalId}`} className="font-mono text-white hover:text-purple-400 transition-colors">
                      {r.tagNumber ? `#${r.tagNumber}` : 'sem brinco'}
                    </Link>
                    <span className="ml-2 text-xs text-zinc-500">{r.category}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{r.pastureName ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-300">{r.bullSemen ?? '—'}</td>
                  <td className="px-4 py-3">
                    <form action={async (fd: FormData) => {
                      'use server';
                      await updateInsemination(r.id, fd);
                      redirect('/inseminations' + (monthFilter ? `?month=${monthFilter}` : ''));
                    }}>
                      <input type="hidden" name="inseminationDate" value={r.inseminationDate ?? ''} />
                      <input type="hidden" name="paid" value={String(r.paid)} />
                      <input type="hidden" name="observations" value={r.observations ?? ''} />
                      <select name="status" defaultValue={r.status ?? 'PENDING'}
                        onChange={() => {}}
                        className={`px-2 py-0.5 rounded text-xs font-medium border-0 focus:outline-none cursor-pointer ${cfg.color} bg-transparent`}>
                        <option value="PENDING">Aguardando</option>
                        <option value="CONFIRMED">Prenha</option>
                        <option value="FAILED">Vazia</option>
                      </select>
                      <button type="submit" className="ml-1 text-xs text-zinc-500 hover:text-white">✓</button>
                    </form>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.paid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-400'}`}>
                      {r.paid ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs max-w-xs truncate">{r.observations ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
