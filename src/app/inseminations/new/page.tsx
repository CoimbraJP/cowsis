import { db } from '@/db';
import { animals, pastures } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { addInsemination } from '@/app/animals/actions';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NewInseminationPage() {
  const allAnimals = await db
    .select({
      id:          animals.id,
      tagNumber:   animals.tagNumber,
      category:    animals.category,
      pastureName: pastures.name,
    })
    .from(animals)
    .leftJoin(pastures, eq(animals.currentPastureId, pastures.id))
    .where(eq(animals.status, 'ACTIVE'))
    .orderBy(animals.tagNumber);

  const today = new Date().toISOString().split('T')[0];

  async function submitAndRedirect(fd: FormData) {
    'use server';
    await addInsemination(fd);
    redirect('/inseminations');
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/inseminations" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-2xl font-bold text-white">Registrar Inseminação</h2>
      </div>

      <form action={submitAndRedirect} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="space-y-1">
          <label className="text-sm text-zinc-400">Animal *</label>
          <select name="animalId" required
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-500">
            <option value="">Selecione o animal</option>
            {allAnimals.map(a => (
              <option key={a.id} value={a.id}>
                {a.tagNumber ? `#${a.tagNumber}` : 'sem brinco'} — {a.category}{a.pastureName ? ` (${a.pastureName})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm text-zinc-400">Data *</label>
            <input type="date" name="inseminationDate" defaultValue={today} required
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-500" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-400">Status</label>
            <select name="status"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-500">
              <option value="PENDING">Aguardando</option>
              <option value="CONFIRMED">Prenha</option>
              <option value="FAILED">Não prenhou</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-zinc-400">Touro / Sêmen</label>
          <input type="text" name="bullSemen" placeholder="Ex: Nelore 300, sêmen sexado..."
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500" />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-zinc-400">Observações</label>
          <input type="text" name="observations" placeholder="Observações opcionais"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500" />
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-400">
          <input type="hidden" name="paid" value="false" />
          <input type="checkbox" name="paid" value="true" className="w-4 h-4 accent-purple-500 rounded" />
          Serviço pago
        </label>

        <div className="flex gap-3 pt-2">
          <button type="submit"
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white py-2.5 rounded-lg font-medium transition-all">
            Registrar
          </button>
          <Link href="/inseminations"
            className="flex-1 text-center bg-zinc-700 hover:bg-zinc-600 text-white py-2.5 rounded-lg font-medium transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
