'use client';

import { useState, useTransition } from 'react';
import { updatePasture } from '../actions';
import { Pencil, Check, X } from 'lucide-react';

export function EditPastureButton({ id, currentName }: { id: number; currentName: string }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentName);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    if (!name.trim() || name.trim() === currentName) { setEditing(false); return; }
    const fd = new FormData();
    fd.set('name', name.trim());
    startTransition(async () => {
      await updatePasture(id, fd);
      setEditing(false);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setName(currentName); setEditing(false); }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="px-2 py-1 text-sm bg-zinc-800 border border-emerald-500/60 rounded-lg text-white focus:outline-none w-44"
        />
        <button
          onClick={handleSave}
          disabled={pending}
          className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50"
          title="Salvar"
        >
          <Check size={15} />
        </button>
        <button
          onClick={() => { setName(currentName); setEditing(false); }}
          className="p-1.5 text-zinc-400 hover:bg-zinc-700/60 rounded-lg transition-colors"
          title="Cancelar"
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="px-3 py-1.5 text-xs text-zinc-300 border border-zinc-700 bg-zinc-800/60
                 hover:bg-zinc-700/80 hover:border-zinc-600 rounded-lg transition-colors flex items-center gap-1.5"
    >
      <Pencil size={13} />
      Editar
    </button>
  );
}
