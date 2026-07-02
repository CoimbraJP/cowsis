import { db } from '@/db';
import { animals, pastures, births, inseminations, animalTransactions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { updateAnimal, deleteAnimal, addVaccine, updateTransactionDate, addInsemination } from '../actions';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AnimalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const animalId = Number(id);
  if (isNaN(animalId)) notFound();

  const [animal] = await db
    .select({
      id: animals.id,
      tagNumber: animals.tagNumber,
      category: animals.category,
      status: animals.status,
      currentPastureId: animals.currentPastureId,
      pastureName: pastures.name,
      weight: animals.weight,
      healthNotes: animals.healthNotes,
    })
    .from(animals)
    .leftJoin(pastures, eq(animals.currentPastureId, pastures.id))
    .where(eq(animals.id, animalId))
    .limit(1);

  if (!animal) notFound();

  const allPastures  = await db.select().from(pastures).orderBy(pastures.name);
  const birthRecords = await db.select().from(births).where(eq(births.motherId, animalId));
  const insemRecords = await db.select().from(inseminations).where(eq(inseminations.animalId, animalId));

  const txRecords = await db
    .select({
      id: animalTransactions.id,
      type: animalTransactions.type,
      transactionDate: animalTransactions.transactionDate,
      monthLabel: animalTransactions.monthLabel,
      notes: animalTransactions.notes,
      fromPastureId: animalTransactions.fromPastureId,
      toPastureId: animalTransactions.toPastureId,
    })
    .from(animalTransactions)
    .where(eq(animalTransactions.animalId, animalId))
    .orderBy(desc(animalTransactions.id));

  const pastureNames = Object.fromEntries(allPastures.map(p => [p.id, p.name]));

  const transfers = txRecords.filter(t => t.type === 'TRANSFER');
  const vaccines  = txRecords.filter(t => t.type === 'VACCINE');
  const others    = txRecords.filter(t => t.type !== 'TRANSFER' && t.type !== 'VACCINE');

  const TX_LABELS: Record<string, string> = {
    SALE: '💰 Venda', DEATH: '💀 Morte', BIRTH: '🐣 Nascimento', ACQUISITION: '📥 Aquisição',
  };

  async function handleUpdate(formData: FormData) {
    'use server';
    await updateAnimal(animalId, formData);
    redirect('/animals');
  }

  async function handleDelete() {
    'use server';
    await deleteAnimal(animalId);
    redirect('/animals');
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/animals" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-2xl font-bold text-white">
          Animal <span className="font-mono">{animal.tagNumber ?? '(sem brinco)'}</span>
        </h2>
      </div>

      {/* Edit form */}
      <form action={handleUpdate} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="text-lg font-semibold text-white">Dados do Animal</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm text-zinc-400">Brinco</label>
            <input name="tagNumber" defaultValue={animal.tagNumber ?? ''} placeholder="Número do brinco"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-400">Status</label>
            <select name="status" defaultValue={animal.status}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500">
              <option value="ACTIVE">Ativo</option>
              <option value="SOLD">Vendido</option>
              <option value="DEAD">Morto</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-400">Categoria</label>
            <select name="category" defaultValue={animal.category}
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
          <div className="space-y-1">
            <label className="text-sm text-zinc-400">Pasto atual</label>
            <select name="currentPastureId" defaultValue={animal.currentPastureId ?? ''}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500">
              <option value="">— Sem pasto —</option>
              {allPastures.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-zinc-400">Peso (kg)</label>
            <input type="number" name="weight" step="0.1" defaultValue={animal.weight ?? ''}
              placeholder="Ex: 450.5"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-sm text-zinc-400">Observações de saúde</label>
            <input name="healthNotes" defaultValue={animal.healthNotes ?? ''}
              placeholder="Ex: vermifugado em jun/26, sem ocorrências"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500" />
          </div>
        </div>
        <button type="submit"
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg font-medium transition-colors">
          Salvar alterações
        </button>
      </form>

      {/* Transfers */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">🔄 Movimentações entre Pastos ({transfers.length})</h3>
        {transfers.length === 0 && (
          <p className="text-zinc-500 text-sm">Nenhuma movimentação registrada ainda.</p>
        )}
        <div className="space-y-2">
          {transfers.map((tx) => (
            <form key={tx.id} action={async (fd: FormData) => {
              'use server';
              const d = fd.get('date') as string;
              if (d) await updateTransactionDate(tx.id, d);
              redirect(`/animals/${animalId}`);
            }} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
              <div className="flex-1 text-sm text-zinc-300">
                <span className="font-medium text-white">
                  {tx.fromPastureId ? pastureNames[tx.fromPastureId] ?? `Pasto #${tx.fromPastureId}` : '—'}
                </span>
                <span className="text-zinc-500 mx-2">→</span>
                <span className="font-medium text-emerald-400">
                  {tx.toPastureId ? pastureNames[tx.toPastureId] ?? `Pasto #${tx.toPastureId}` : '—'}
                </span>
              </div>
              <input type="date" name="date" defaultValue={tx.transactionDate ?? today}
                className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-emerald-500" />
              <button type="submit"
                className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors">
                Salvar data
              </button>
            </form>
          ))}
        </div>
      </div>

      {/* Vaccines */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">💉 Vacinas ({vaccines.length})</h3>
        <form action={addVaccine} className="flex flex-wrap gap-2 items-end">
          <input type="hidden" name="animalId" value={animalId} />
          <div className="space-y-1 flex-1 min-w-[150px]">
            <label className="text-xs text-zinc-400">Nome da vacina</label>
            <input name="vaccineName" required placeholder="Ex: Aftosa, Brucelose..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Data</label>
            <input type="date" name="vaccineDate" defaultValue={today}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 text-sm" />
          </div>
          <button type="submit"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
            Registrar
          </button>
        </form>
        {vaccines.length > 0 && (
          <div className="space-y-2">
            {vaccines.map((tx) => (
              <form key={tx.id} action={async (fd: FormData) => {
                'use server';
                const d = fd.get('date') as string;
                if (d) await updateTransactionDate(tx.id, d);
                redirect(`/animals/${animalId}`);
              }} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
                <span className="flex-1 text-sm text-zinc-300">{tx.notes}</span>
                <input type="date" name="date" defaultValue={tx.transactionDate ?? today}
                  className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-emerald-500" />
                <button type="submit"
                  className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors">
                  Salvar data
                </button>
              </form>
            ))}
          </div>
        )}
      </div>

      {/* Inseminations */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">🧬 Inseminações ({insemRecords.length})</h3>
        <form action={async (fd: FormData) => {
          'use server';
          fd.set('animalId', String(animalId));
          await addInsemination(fd);
          redirect(`/animals/${animalId}`);
        }} className="flex flex-wrap gap-2 items-end border-b border-zinc-800 pb-4">
          <div className="space-y-1 flex-1 min-w-[120px]">
            <label className="text-xs text-zinc-400">Data</label>
            <input type="date" name="inseminationDate" defaultValue={today}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm" />
          </div>
          <div className="space-y-1 flex-1 min-w-[120px]">
            <label className="text-xs text-zinc-400">Touro / Sêmen</label>
            <input type="text" name="bullSemen" placeholder="Ex: Nelore 300"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Status</label>
            <select name="status"
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm">
              <option value="PENDING">Aguardando</option>
              <option value="CONFIRMED">Prenha</option>
              <option value="FAILED">Vazia</option>
            </select>
          </div>
          <button type="submit"
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-colors">
            Registrar
          </button>
        </form>
        {insemRecords.length === 0 && (
          <p className="text-zinc-500 text-sm">Nenhuma inseminação registrada ainda.</p>
        )}
        {insemRecords.map((ins) => (
          <div key={ins.id} className="flex items-center justify-between text-sm py-2 border-b border-zinc-800 last:border-0">
            <div className="flex flex-wrap gap-2 text-zinc-400">
              <span>{ins.inseminationDate ?? '—'}</span>
              {ins.bullSemen && <span className="text-zinc-500">• {ins.bullSemen}</span>}
              {ins.observations && <span className="text-zinc-500 italic">• {ins.observations}</span>}
            </div>
            <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
              ins.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-400' :
              ins.status === 'FAILED'    ? 'bg-red-500/10 text-red-400' :
                                           'bg-amber-500/10 text-amber-400'
            }`}>
              {ins.status === 'CONFIRMED' ? 'Prenha' : ins.status === 'FAILED' ? 'Vazia' : 'Aguardando'}
            </span>
          </div>
        ))}
      </div>

      {/* Births */}
      {birthRecords.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3">
          <h3 className="text-lg font-semibold text-white">🐣 Nascimentos ({birthRecords.length})</h3>
          {birthRecords.map((b) => (
            <div key={b.id} className="flex items-center justify-between text-sm py-2 border-b border-zinc-800 last:border-0">
              <div className="flex flex-wrap gap-2 text-zinc-400">
                <span>{b.birthDate ?? '—'}</span>
                {b.offspringGender && <span>• {b.offspringGender}</span>}
                {b.observations && <span className="italic text-zinc-500">• {b.observations}</span>}
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                b.status === 'ALIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
              }`}>
                {b.status === 'ALIVE' ? 'Vivo' : 'Natimorto'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Other transactions */}
      {others.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3">
          <h3 className="text-lg font-semibold text-white">📋 Outras movimentações ({others.length})</h3>
          {others.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between text-sm py-2 border-b border-zinc-800 last:border-0">
              <div className="flex flex-wrap gap-2 text-zinc-400">
                <span className="text-white">{TX_LABELS[tx.type] ?? tx.type}</span>
                {tx.monthLabel && <span className="text-zinc-500">• {tx.monthLabel}</span>}
                {tx.notes && <span className="text-zinc-500 italic">• {tx.notes}</span>}
              </div>
              <span className="text-zinc-500 text-xs">{tx.transactionDate ?? ''}</span>
            </div>
          ))}
        </div>
      )}

      {/* Delete */}
      <form action={handleDelete} className="rounded-xl border border-red-900/30 bg-zinc-900/50 p-6 space-y-3">
        <h3 className="text-base font-semibold text-red-400">Zona de perigo</h3>
        <p className="text-sm text-zinc-500">Remove permanentemente o animal e todos os seus registros.</p>
        <button type="submit"
          className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-900/40 rounded-lg text-sm font-medium transition-colors">
          Excluir animal
        </button>
      </form>
    </div>
  );
}
