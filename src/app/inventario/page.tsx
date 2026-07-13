import { db } from '@/db';
import { countingItems, countingSessions } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import Link from 'next/link';
import { ClipboardList, Plus, CheckCircle2, Clock } from 'lucide-react';
import { startSession } from './actions';

export const dynamic = 'force-dynamic';

export default async function InventarioPage() {
  const sessions = await db
    .select({
      id: countingSessions.id,
      name: countingSessions.name,
      startedAt: countingSessions.startedAt,
      finishedAt: countingSessions.finishedAt,
      status: countingSessions.status,
      total: sql<number>`count(${countingItems.id})`.mapWith(Number),
      confirmed: sql<number>`count(case when ${countingItems.status} = 'CONFIRMED' then 1 end)`.mapWith(Number),
      moved: sql<number>`count(case when ${countingItems.status} = 'MOVED' then 1 end)`.mapWith(Number),
      untreated: sql<number>`count(case when ${countingItems.status} = 'UNTREATED' then 1 end)`.mapWith(Number),
    })
    .from(countingSessions)
    .leftJoin(countingItems, eq(countingItems.sessionId, countingSessions.id))
    .groupBy(countingSessions.id)
    .orderBy(desc(countingSessions.startedAt));

  const activeSession = sessions.find((s) => s.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList size={24} className="text-emerald-400" />
          <h2 className="text-2xl font-bold text-white">Inventário do Mês</h2>
        </div>

        {!activeSession && (
          <form action={startSession}>
            <div className="flex gap-2">
              <input
                name="name"
                placeholder="Nome da contagem (ex: Julho 2026)"
                required
                className="w-64 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Nova Contagem
              </button>
            </div>
          </form>
        )}
      </div>

      {activeSession && (
        <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-emerald-400 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-emerald-300">Contagem em andamento: {activeSession.name}</p>
              <p className="text-xs text-emerald-600">
                {activeSession.confirmed + activeSession.moved} de {activeSession.total} animais processados
              </p>
            </div>
          </div>
          <Link
            href={`/inventario/${activeSession.id}`}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Continuar →
          </Link>
        </div>
      )}

      {!activeSession && (
        <form action={startSession} className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-white">Iniciar nova contagem</p>
            <p className="text-xs text-zinc-500">Cria um snapshot de todos os animais ativos e permite confirmar cada um.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              name="name"
              placeholder="Ex: Julho 2026"
              required
              className="flex-1 sm:w-52 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
              <Plus size={16} />
              Iniciar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {sessions.length === 0 && (
          <div className="text-center py-16 text-zinc-600">
            <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
            <p>Nenhuma contagem ainda.</p>
          </div>
        )}

        {sessions.map((s) => {
          const pct = s.total > 0 ? Math.round(((s.confirmed + s.moved) / s.total) * 100) : 0;
          const isActive = s.status === 'ACTIVE';
          return (
            <Link
              key={s.id}
              href={`/inventario/${s.id}`}
              className={`block rounded-xl border p-4 transition-colors hover:border-zinc-600 ${
                isActive
                  ? 'border-emerald-700/60 bg-emerald-950/20'
                  : 'border-zinc-800 bg-zinc-900/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isActive ? (
                    <Clock size={15} className="text-emerald-400" />
                  ) : (
                    <CheckCircle2 size={15} className="text-zinc-500" />
                  )}
                  <span className="font-medium text-white text-sm">{s.name}</span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-700 text-zinc-400'
                    }`}
                  >
                    {isActive ? 'ATIVA' : 'CONCLUÍDA'}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">{s.startedAt}</span>
              </div>

              <div className="flex items-center gap-3 text-xs text-zinc-500 mb-2">
                <span className="text-emerald-400">{s.confirmed} confirmados</span>
                <span className="text-blue-400">{s.moved} movidos</span>
                <span className="text-red-400">{s.untreated} sem tratar</span>
                <span className="text-zinc-600">/ {s.total} total</span>
              </div>

              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
