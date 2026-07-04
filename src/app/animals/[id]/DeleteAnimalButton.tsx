'use client';

import { useTransition } from 'react';
import { deleteAnimal } from '../actions';

export function DeleteAnimalButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm('Tem certeza? Esta ação remove permanentemente o animal e todos os seus registros (vacinas, inseminações, movimentações).')) return;
    startTransition(() => deleteAnimal(id));
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-900/40 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
    >
      {pending ? 'Excluindo...' : 'Excluir animal'}
    </button>
  );
}
