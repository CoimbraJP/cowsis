import { db } from '@/db';
import { animals, pastures, births, inseminations, animalTransactions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { updateAnimal, deleteAnimal, addVaccine, deleteVaccine, updateTransactionDate, addInsemination } from '../actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

const INSEM_LABELS: Record<string, { label: string; cls: string }> = {
  CONFIRMED: { label: 'Prenha',    cls: 'bg-emerald-500/10 text-emerald-400' },
  FAILED:    { label: 'Pronto',    cls: 'bg-zinc-500/20 text-zinc-400' },
  PENDING:   { label: 'Aguardando', cls: 'bg-amber-500/10 text-amber-400' },
};
const TX_LABELS: Record<string, string> = {
  SALE: '💰 Venda', DEATH: '💀 Morte', BIRTH: '🐣 Nascimento', ACQUISITION: '📥 Aquisição',
};

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
      isPregnant: animals.isPregnant,
    })
    .from(animals)
    .leftJoin(pastures, eq(animals.currentPastureId, pastures.id))
    .where(eq(animals.id, animalId))
    .limit(1);

  if (!animal) notFound();

  const allPastures  = await db.select().from(pastures).orderBy(pastures.name);
  const birthRecords = await db.select().from(births).where(eq(births.motherId, animalId));
  const insemRecords = await db.select().from(inseminations).where(eq(inseminations.animalId, animalId)).orderBy(desc(inseminations.id));

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
  const originTx  = txRecords.find(t => t.type === 'BIRTH' || t.type === 'ACQUISITION');
  const others    = txRecords.filter(t => !['TRANSFER','VACCINE','BIRTH','ACQUISITION'].includes(t.type));

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
        {animal.isPregnant && (
          <span className="px-2 py-0.5 text-xs bg-pink-500/15 text-pink-400 rounded-full border border-pink-500/20 font-medium">
            🤰 Prenha
          </span>
        )}
      </div>

      {/* Edit form */}
      <form action={async (fd: FormData) => {
        'use server';
        await updateAnimal(animalId, fd);
      }} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
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
          <div className="space-y-1 flex items-center gap-3 pt-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300">
              <input type="hidden" name="isPregnant" value="false" />
              <input type="checkbox" name="isPregnant" value="true"
                defaultChecked={animal.isPregnant ?? false}
                className="w-4 h-4 accent-pink-500 rounded" />
              Prenha
            </label>
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-sm text-zinc-400">Observações de saúde</label>
            <input name="healthNotes" defaultValue={animal.healthNotes ?? ''}
              placeholder="Ex: vermifugado em jun/26, sem ocorrências"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        {/* Origem */}
        <div className="border-t border-zinc-800 pt-4 space-y-2">
          <p className="text-sm font-medium text-zinc-300">Origem do animal</p>
          {originTx ? (
            <div className="flex items-center gap-3 text-sm text-zinc-400 bg-zinc-800/50 px-3 py-2 rounded-lg">
              <span>{originTx.type === 'BIRTH' ? '🐣 Nascimento' : '📥 Aquisição'}</span>
              <span className="text-zinc-600">•</span>
              <span>{originTx.transactionDate ?? '—'}</span>
              <form action={async (fd: FormData) => {
                'use server';
                const d = fd.get('date') as string;
                if (d) await updateTransactionDate(originTx.id, d);
              }} className="flex items-center gap-2 ml-auto">
                <input type="date" name="date" defaultValue={originTx.transactionDate ?? today}
                  className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-emerald-500" />
                <button type="submit" className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors">
                  Salvar data
                </button>
              </form>
            </div>
          ) : (
            <p className="text-xs text-zinc-600 italic">Nenhuma origem registrada (Próprio)</p>
          )}
        </div>

        <button type="submit"
          className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white py-2 rounded-lg font-medium transition-all">
          Salvar alterações
        </button>
      </form>

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
          <div className="space-y-1">
            {vaccines.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
                <span className="flex-1 text-sm text-zinc-300">{tx.notes}</span>
                <span className="text-xs text-zinc-600">{tx.transactionDate}</span>
                <form action={async () => {
                  'use server';
                  await deleteVaccine(tx.id, animalId);
                }}>
                  <button type="submit"
                    className="px-2 py-0.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors">
                    Apagar
                  </button>
                </form>
              </div>
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
              <option value="FAILED">Pronto</option>
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
        {insemRecords.map((ins) => {
          const badge = INSEM_LABELS[ins.status ?? 'PENDING'];
          return (
            <div key={ins.id} className="flex items-center justify-between text-sm py-2 border-b border-zinc-800 last:border-0">
              <div className="flex flex-wrap gap-2 text-zinc-400">
                <span>{ins.inseminationDate ?? '—'}</span>
                {ins.bullSemen && <span className="text-zinc-500">• {ins.bullSemen}</span>}
                {ins.observations && <span className="text-zinc-500 italic">• {ins.observations}</span>}
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Transfers */}
      {transfers.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">🔄 Movimentações entre Pastos ({transfers.length})</h3>
          <div className="space-y-2">
            {transfers.map((tx) => (
              <form key={tx.id} action={async (fd: FormData) => {
                'use server';
                const d = fd.get('date') as string;
                if (d) await updateTransactionDate(tx.id, d);
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
                <button type="submit" className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors">
                  Salvar data
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

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
      <form action={async () => {
        'use server';
        await deleteAnimal(animalId);
      }} className="rounded-xl border border-red-900/30 bg-zinc-900/50 p-6 space-y-3">
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
