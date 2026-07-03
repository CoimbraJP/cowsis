import { createPasture } from '../actions';
import Link from 'next/link';
import { ArrowLeft, Trees } from 'lucide-react';

export default function NewPasturePage() {
  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/pastures" className="text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <Trees className="h-6 w-6 text-emerald-400" />
        <h2 className="text-2xl font-bold text-white">Novo Pasto</h2>
      </div>

      <form action={createPasture}
        className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="space-y-1">
          <label className="text-sm text-zinc-400">Nome do pasto *</label>
          <input
            type="text"
            name="name"
            required
            autoFocus
            placeholder="Ex: Pasto Norte, Retiro A..."
            className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white
                       placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit"
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white py-2.5 rounded-lg font-medium transition-all">
            Criar pasto
          </button>
          <Link href="/pastures"
            className="flex-1 text-center bg-zinc-700 hover:bg-zinc-600 text-white py-2.5 rounded-lg font-medium transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
