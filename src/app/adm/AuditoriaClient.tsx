'use client';

import { useState } from 'react';
import { ClipboardCheck, ArrowLeft, ChevronRight } from 'lucide-react';

// ─── quando quiser ativar o save, descomentar e implementar esta action ───
// import { saveAuditoriaSnapshot } from './actions';
// ─────────────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  VACA:    'bg-blue-500/10 text-blue-400',
  TOURO:   'bg-red-500/10 text-red-400',
  NOVILHA: 'bg-purple-500/10 text-purple-400',
  NOVILHO: 'bg-pink-500/10 text-pink-400',
  BEZERRO: 'bg-amber-500/10 text-amber-400',
  BEZERRA: 'bg-yellow-500/10 text-yellow-400',
};

type Pasture = { id: number; name: string; count: number };
type Animal  = { id: number; tagNumber: string | null; category: string; currentPastureId: number | null };

type Props = {
  pastures: Pasture[];
  animals: Animal[];
};

type Step = 'list' | 'audit' | 'confirm';

export function AuditoriaClient({ pastures, animals }: Props) {
  const [step, setStep]                     = useState<Step>('list');
  const [selectedPasture, setSelectedPasture] = useState<Pasture | null>(null);
  const [audited, setAudited]               = useState<Set<number>>(new Set());

  // Animals that belong to the selected pasture
  const pastureAnimals = selectedPasture
    ? animals.filter(a => a.currentPastureId === selectedPasture.id)
    : [];

  const pending  = pastureAnimals.filter(a => !audited.has(a.id));
  const confirmed = pastureAnimals.filter(a =>  audited.has(a.id));

  function openPasture(p: Pasture) {
    setSelectedPasture(p);
    setAudited(new Set());
    setStep('audit');
  }

  function moveToAudited(id: number) {
    setAudited(prev => new Set([...prev, id]));
  }

  function removeFromAudited(id: number) {
    setAudited(prev => { const s = new Set(prev); s.delete(id); return s; });
  }

  // ─── stub: when ready, call saveAuditoriaSnapshot here ───────────────
  async function handleSave() {
    // TODO: await saveAuditoriaSnapshot(selectedPasture!.id, [...audited], [...pending.map(a=>a.id)])
    alert('💾 Salvar desativado — ative em AuditoriaClient.tsx quando pronto.');
  }
  // ─────────────────────────────────────────────────────────────────────

  // ── STEP: list ────────────────────────────────────────────────────────
  if (step === 'list') {
    return (
      <div className="space-y-4">
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Selecione o pasto</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {pastures.map(p => (
            <button
              key={p.id}
              onClick={() => openPasture(p)}
              className="group rounded-xl border border-zinc-800/60 bg-zinc-900/60 p-4 text-left hover:border-emerald-500/40 hover:bg-zinc-900/80 transition-all duration-200 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">{p.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{p.count} {p.count === 1 ? 'animal' : 'animais'}</p>
              </div>
              <ChevronRight size={16} className="text-zinc-600 group-hover:text-emerald-500 transition-colors" />
            </button>
          ))}
        </div>
        {pastures.length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-8">Nenhum pasto com animais ativos.</p>
        )}
      </div>
    );
  }

  // ── STEP: confirm ─────────────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('audit')} className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <ClipboardCheck size={18} className="text-emerald-400" />
          <span className="text-white font-medium">{selectedPasture?.name} — Resultado</span>
        </div>

        {/* Confirmed */}
        <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 overflow-hidden">
          <div className="px-4 py-3 border-b border-emerald-800/30 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              ✓ Confirmados no pasto
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
              {confirmed.length}
            </span>
          </div>
          {confirmed.length === 0 ? (
            <p className="px-4 py-6 text-sm text-zinc-500 text-center">Nenhum animal auditado</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-emerald-900/30">
                {confirmed.map(a => (
                  <tr key={a.id} className="bg-emerald-950/30">
                    <td className="px-4 py-2.5 font-mono text-emerald-300 font-semibold">
                      #{a.tagNumber ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[a.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
                        {a.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-emerald-500">Presente</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Missing */}
        {pending.length > 0 && (
          <div className="rounded-xl border border-red-800/40 bg-red-950/20 overflow-hidden">
            <div className="px-4 py-3 border-b border-red-800/30 flex items-center justify-between">
              <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                ✗ Não encontrados
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400 font-medium">
                {pending.length}
              </span>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-red-900/30">
                {pending.map(a => (
                  <tr key={a.id} className="bg-red-950/20">
                    <td className="px-4 py-2.5 font-mono text-red-300 font-semibold">
                      #{a.tagNumber ?? '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[a.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
                        {a.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-red-400">Ausente</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setStep('audit')}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white border border-zinc-700 rounded-lg hover:border-zinc-600 transition-all"
          >
            Voltar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-700/50 rounded-lg transition-all"
          >
            💾 Salvar composição
          </button>
        </div>
      </div>
    );
  }

  // ── STEP: audit ───────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('list')} className="text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <span className="text-white font-medium">{selectedPasture?.name}</span>
        </div>
        <span className="text-xs text-zinc-500">
          {confirmed.length} de {pastureAnimals.length} auditados
        </span>
      </div>

      {/* No Pasto table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <div className="px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">No pasto</span>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium">{pending.length}</span>
        </div>
        {pending.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500 text-center">Todos os animais foram auditados</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/50 text-zinc-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5 text-left">Brinco</th>
                <th className="px-4 py-2.5 text-left">Categoria</th>
                <th className="px-4 py-2.5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {pending.map(a => (
                <tr key={a.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-white font-semibold">
                    {a.tagNumber ?? <span className="text-zinc-500 italic font-normal">sem brinco</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[a.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
                      {a.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => moveToAudited(a.id)}
                      className="text-xs px-3 py-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-700/40 transition-all font-medium"
                    >
                      Confirmar ↓
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Auditados table */}
      <div className="rounded-xl border border-emerald-800/40 overflow-hidden">
        <div className="px-4 py-2.5 bg-emerald-950/30 border-b border-emerald-800/30 flex items-center justify-between">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Auditados</span>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">{confirmed.length}</span>
        </div>
        {confirmed.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500 text-center">Clique em "Confirmar" nos animais que estão no pasto</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-emerald-950/20 text-zinc-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5 text-left">Brinco</th>
                <th className="px-4 py-2.5 text-left">Categoria</th>
                <th className="px-4 py-2.5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/30">
              {confirmed.map(a => (
                <tr key={a.id} className="bg-emerald-950/20 hover:bg-emerald-950/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-emerald-300 font-semibold">
                    {a.tagNumber ?? <span className="text-zinc-500 italic font-normal">sem brinco</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[a.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
                      {a.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => removeFromAudited(a.id)}
                      className="text-xs px-3 py-1.5 rounded bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 border border-zinc-600/40 transition-all"
                    >
                      ↑ Desfazer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setStep('list')}
          className="px-4 py-2 text-sm text-zinc-400 hover:text-white border border-zinc-700 rounded-lg hover:border-zinc-600 transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={() => setStep('confirm')}
          className="px-5 py-2 text-sm font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-700/50 rounded-lg transition-all"
        >
          Ver resultado →
        </button>
      </div>
    </div>
  );
}
