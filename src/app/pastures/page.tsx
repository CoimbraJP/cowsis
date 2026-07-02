import { db } from "@/db";
import { pastures, animals } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { Trees, Plus, Pencil, PowerOff } from "lucide-react";
import Link from "next/link";
import { createPasture, updatePasture, togglePastureActive } from "./actions";

export const dynamic = "force-dynamic";

export default async function PasturesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const sp = await searchParams;
  const editingId = sp.edit ? Number(sp.edit) : null;

  const pasturesList = await db
    .select({
      id: pastures.id,
      name: pastures.name,
      active: pastures.active,
      animalCount: sql<number>`count(${animals.id})`,
    })
    .from(pastures)
    .leftJoin(animals, eq(pastures.id, animals.currentPastureId))
    .groupBy(pastures.id)
    .orderBy(pastures.name);

  const activeCount   = pasturesList.filter(p => p.active).length;
  const inactiveCount = pasturesList.filter(p => !p.active).length;
  const totalAnimals  = pasturesList.reduce((s, p) => s + Number(p.animalCount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Trees className="h-8 w-8 text-emerald-400" />
            Pastos
          </h2>
          <p className="text-zinc-400 mt-1">
            {activeCount} ativos · {inactiveCount > 0 ? `${inactiveCount} inativos · ` : ''}{totalAnimals} animais no total
          </p>
        </div>
      </div>

      {/* Create pasture form */}
      <details className="rounded-xl border border-zinc-800 bg-zinc-900/50">
        <summary className="px-6 py-4 cursor-pointer text-white font-semibold hover:text-emerald-400 transition-colors flex items-center gap-2">
          <Plus size={16} /> Novo pasto
        </summary>
        <form action={createPasture} className="px-6 pb-6 flex gap-3 items-end">
          <div className="space-y-1 flex-1">
            <label className="text-sm text-zinc-400">Nome do pasto *</label>
            <input type="text" name="name" required placeholder="Ex: Pasto Norte, Retiro A..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500" />
          </div>
          <button type="submit"
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors">
            Criar
          </button>
        </form>
      </details>

      {/* Pastures grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pasturesList.map((pasto) => (
          <div key={pasto.id}
            className={`rounded-xl border bg-zinc-900/50 p-5 flex flex-col gap-3 transition-all ${
              pasto.active ? 'border-zinc-800' : 'border-zinc-800/50 opacity-60'
            }`}>

            <div className="flex items-start justify-between gap-2">
              {editingId === pasto.id ? (
                <form action={async (fd: FormData) => {
                  'use server';
                  await updatePasture(pasto.id, fd);
                }} className="flex gap-2 flex-1">
                  <input type="text" name="name" defaultValue={pasto.name} autoFocus
                    className="flex-1 px-2 py-1 text-sm bg-zinc-800 border border-emerald-500 rounded text-white focus:outline-none" />
                  <button type="submit"
                    className="px-3 py-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded font-medium">
                    Salvar
                  </button>
                  <Link href="/pastures" className="px-3 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded">
                    ✕
                  </Link>
                </form>
              ) : (
                <Link href={`/pastures/${pasto.id}`}
                  className="text-lg font-semibold text-white hover:text-emerald-400 transition-colors flex-1">
                  {pasto.name}
                </Link>
              )}
              <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${pasto.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-400'}`}>
                {pasto.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>

            <div>
              <p className="text-3xl font-bold text-zinc-100">{pasto.animalCount}</p>
              <p className="text-xs text-zinc-500">animais no momento</p>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-zinc-800">
              <Link href={`/pastures/${pasto.id}`}
                className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors">
                Ver animais →
              </Link>
              <div className="flex-1" />
              <Link href={`/pastures?edit=${pasto.id}`}
                className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Renomear">
                <Pencil size={13} />
              </Link>
              <form action={async () => {
                'use server';
                await togglePastureActive(pasto.id, !pasto.active);
              }}>
                <button type="submit"
                  className={`p-1.5 rounded transition-colors ${pasto.active
                    ? 'text-zinc-500 hover:text-red-400 hover:bg-red-900/20'
                    : 'text-zinc-500 hover:text-emerald-400 hover:bg-emerald-900/20'
                  }`}
                  title={pasto.active ? 'Desativar pasto' : 'Reativar pasto'}>
                  <PowerOff size={13} />
                </button>
              </form>
            </div>
          </div>
        ))}

        {pasturesList.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-zinc-800 rounded-xl">
            <p className="text-zinc-400">Nenhum pasto cadastrado ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
