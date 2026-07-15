'use client';

import { useTransition } from 'react';

interface Props {
  snapshotId: number;
  pastureId:  number;
  action:     (snapshotId: number, pastureId: number) => Promise<void>;
}

export function DeleteSnapshotButton({ snapshotId, pastureId, action }: Props) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm('Tem certeza que deseja apagar este snapshot? Esta ação não pode ser desfeita.')) return;
    startTransition(() => action(snapshotId, pastureId));
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="px-4 py-2 bg-red-900/30 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-700/60 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
    >
      {pending ? 'Apagando…' : '🗑 Apagar Composição'}
    </button>
  );
}
