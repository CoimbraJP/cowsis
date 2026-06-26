import { db } from "@/db";
import { pastures, animals } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { Trees, Plus } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PasturesPage() {
  let pasturesList: any[] = [];

  try {
    pasturesList = await db
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
  } catch (e) {
    console.error("DB error on pastures page:", e);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Trees className="h-8 w-8 text-emerald-400" />
            Pastos
          </h2>
          <p className="text-zinc-400 mt-2">
            {pasturesList.length} pastos · {pasturesList.reduce((s, p) => s + Number(p.animalCount), 0)} animais no total
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pasturesList.map((pasto) => (
          <Link
            key={pasto.id}
            href={`/pastures/${pasto.id}`}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col gap-4 hover:border-emerald-500/50 hover:bg-zinc-900 transition-all group"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
                {pasto.name}
              </h3>
              <div className={`px-2 py-1 rounded text-xs font-medium ${pasto.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {pasto.active ? 'Ativo' : 'Inativo'}
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-zinc-100">{pasto.animalCount}</p>
              <p className="text-sm text-zinc-500">animais no momento</p>
            </div>
            <p className="text-xs text-zinc-600 group-hover:text-emerald-600 transition-colors">
              Ver animais →
            </p>
          </Link>
        ))}

        {pasturesList.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed border-zinc-800 rounded-xl">
            <p className="text-zinc-400">Nenhum pasto encontrado ou banco desconectado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
