'use client';

import { useTransition } from 'react';
import { deletePasture } from '../actions';

export function DeletePastureButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm('Tem certeza que deseja apagar este pasto? Os animais serão removidos do pasto mas não serão excluídos.')) return;
    startTransition(() => deletePasture(id));
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      className="px-3 py-1.5 text-xs text-red-400 border border-red-900/40 bg-red-900/10
                 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
    >
      {pending ? 'Apagando...' : 'Apagar pasto'}
    </button>
  );
}
