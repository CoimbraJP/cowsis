import { db } from '@/db';
import { pastures } from '@/db/schema';
import { createAnimal } from '../actions';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NewAnimalPage({
  searchParams,
}: {
  searchParams: Promise<{ pastureId?: string }>;
}) {
  const sp = await searchParams;
  const preselectedPastureId = sp.pastureId || '';
  const allPastures = await db.select().from(pastures).orderBy(pastures.name);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/animals" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-2xl font-bold text-white">Novo Animal</h2>
      </div>

      <form action={createAnimal} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm text-zinc-400">Brinco (número)</label>
            <input name="tagNumber" placeholder="Ex: 123"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-400">Categoria *</label>
            <select name="category" required
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500">
              <option value="VACA">Vaca</option>
              <option value="BEZERRO">Bezerro</option>
              <option value="BEZERRA">Bezerra</option>
              <option value="TOURO">Touro</option>
              <option value="NOVILHA">Novilha</option>
              <option value="NOVILHO">Novilho</option>
              <option value="BÚFALO">Búfalo</option>
              <option value="BÚFALA">Búfala</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-zinc-400">Pasto atual</label>
          <select name="currentPastureId" defaultValue={preselectedPastureId}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500">
            <option value="">— Sem pasto —</option>
            {allPastures.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Origem */}
        <div className="border-t border-zinc-800 pt-4 space-y-3">
          <p className="text-sm font-medium text-zinc-300">Origem do animal</p>
          <div className="space-y-1">
            <label className="text-sm text-zinc-400">Tipo de entrada</label>
            <select name="origin" id="originSelect"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500">
              <option value="">Próprio (sem registro)</option>
              <option value="BIRTH">Nascimento</option>
              <option value="ACQUISITION">Aquisição</option>
            </select>
          </div>
          <div className="space-y-1" id="originDateWrap">
            <label className="text-sm text-zinc-400">Data</label>
            <input type="date" name="originDate" defaultValue={today}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit"
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white py-2.5 rounded-lg font-medium transition-all">
            Salvar
          </button>
          <Link href="/animals"
            className="flex-1 text-center bg-zinc-700 hover:bg-zinc-600 text-white py-2.5 rounded-lg font-medium transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
