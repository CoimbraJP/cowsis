'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

const CATEGORY_COLORS: Record<string, string> = {
  VACA:    'bg-blue-500/10 text-blue-400',
  TOURO:   'bg-red-500/10 text-red-400',
  NOVILHA: 'bg-purple-500/10 text-purple-400',
  NOVILHO: 'bg-pink-500/10 text-pink-400',
  BEZERRO: 'bg-amber-500/10 text-amber-400',
  BEZERRA: 'bg-yellow-500/10 text-yellow-400',
};

type Animal = {
  id: number;
  tagNumber: string | null;
  category: string;
  status: string;
  isPregnant?: boolean | null;
};

type Pasture = { id: number; name: string };

type Props = {
  list: Animal[];
  allPastures: Pasture[];
  pastureId: number;
  isHistorical: boolean;
  moveAction: (animalId: number, fromPastureId: number, toPastureId: number | null, date: string | null) => Promise<void>;
  today: string;
};

export function SelectableAnimalTable({ list, allPastures, pastureId, isHistorical, moveAction, today }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [, startTransition] = useTransition();

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (list.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <p className="px-4 py-8 text-center text-zinc-500 text-sm">
          {isHistorical ? 'Nenhum animal neste snapshot.' : 'Nenhum animal.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      <table className="w-full text-sm table-fixed">
        <thead className="bg-zinc-900 text-zinc-400 uppercase text-xs tracking-wider">
          <tr>
            <th className={`px-4 py-3 text-left ${isHistorical ? 'w-[25%]' : 'w-[15%]'}`}>Brinco</th>
            <th className={`px-4 py-3 text-left ${isHistorical ? 'w-[28%]' : 'w-[18%]'}`}>Categoria</th>
            <th className={`px-4 py-3 text-left ${isHistorical ? 'w-[30%]' : 'w-[16%]'}`}>Status</th>
            {!isHistorical && <th className="px-4 py-3 text-left">Mover</th>}
            <th className="px-4 py-3 text-center w-[10%]">✓</th>
            <th className="px-4 py-3 text-right w-[8%]">Ver</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {list.map((animal) => {
            const isSel = selected.has(animal.id);
            return (
              <tr key={animal.id}
                className={`transition-colors ${isSel ? 'bg-emerald-950/50 border-l-2 border-emerald-500' : 'hover:bg-zinc-800/50'}`}>
                <td className="px-4 py-3 font-mono text-white font-semibold">
                  {animal.tagNumber ?? <span className="text-zinc-500 italic font-normal">sem brinco</span>}
                  {animal.isPregnant && (
                    <span className="ml-2 text-[10px] bg-pink-500/10 text-pink-400 px-1.5 py-0.5 rounded font-normal">PRENHA</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[animal.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
                    {animal.category}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    animal.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                    animal.status === 'SOLD'   ? 'bg-zinc-500/10 text-zinc-400' :
                                                 'bg-red-900/20 text-red-500'
                  }`}>
                    {animal.status === 'ACTIVE' ? 'Ativo' : animal.status === 'SOLD' ? 'Vendido' : 'Morto'}
                  </span>
                </td>
                {!isHistorical && (
                  <td className="px-4 py-3">
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      const targetId = fd.get('targetPastureId');
                      const moveDate = fd.get('moveDate') as string | null;
                      startTransition(() => {
                        moveAction(animal.id, pastureId, targetId ? Number(targetId) : null, moveDate ?? null);
                      });
                    }} className="flex items-center gap-1.5">
                      <select name="targetPastureId" defaultValue={pastureId}
                        className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-emerald-500 max-w-[140px]">
                        <option value="">— Sem pasto —</option>
                        {allPastures.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input type="date" name="moveDate" defaultValue={today}
                        className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-emerald-500 w-32" />
                      <button type="submit"
                        className="px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded transition-colors font-medium whitespace-nowrap">
                        Mover
                      </button>
                    </form>
                  </td>
                )}
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggle(animal.id)}
                    className={`w-6 h-6 rounded border-2 transition-all flex items-center justify-center text-xs font-bold ${
                      isSel
                        ? 'bg-emerald-500 border-emerald-400 text-white'
                        : 'border-zinc-600 hover:border-emerald-500 text-transparent'
                    }`}
                  >
                    ✓
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/animals/${animal.id}?from=/pastures/${pastureId}`}
                    className="text-zinc-400 hover:text-emerald-400 transition-colors text-xs px-2 py-1 rounded hover:bg-zinc-800">
                    Ver
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
