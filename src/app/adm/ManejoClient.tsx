'use client';

import { useState, useMemo, useRef } from 'react';
import {
  ClipboardCheck, Syringe, ArrowLeftRight, ArrowLeft,
  ChevronRight, Check, Plus, CalendarDays,
} from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  VACA:    'bg-blue-500/10 text-blue-400',
  TOURO:   'bg-red-500/10 text-red-400',
  NOVILHA: 'bg-purple-500/10 text-purple-400',
  NOVILHO: 'bg-pink-500/10 text-pink-400',
  BEZERRO: 'bg-amber-500/10 text-amber-400',
  BEZERRA: 'bg-yellow-500/10 text-yellow-400',
};

const VACINAS_SUGERIDAS = [
  'Aftosa', 'Brucelose', 'Clostridiose (Polivalente)',
  'Raiva', 'Carbúnculo', 'Vermífugo',
];

type Pasture   = { id: number; name: string; count: number };
type AllPast   = { id: number; name: string };
type Animal    = { id: number; tagNumber: string | null; category: string; currentPastureId: number | null };
type NewAnimal = { tempId: string; tagNumber: string };
type Props     = { pastures: Pasture[]; allPastures: AllPast[]; animals: Animal[] };

type Mode = 'conferencia' | 'vacinacao' | 'movimentacao';
type Step = 'mode' | 'pasture' | 'select' | 'confirm';

const MODES: { key: Mode; label: string; desc: string; Icon: any; accent: string; ring: string }[] = [
  { key: 'conferencia',  label: 'Conferência de Pasto', desc: 'Confirmar quem está presente e descobrir quem está faltando', Icon: ClipboardCheck, accent: 'text-emerald-400', ring: 'hover:border-emerald-500/40' },
  { key: 'vacinacao',    label: 'Vacinação em Lote',    desc: 'Registrar a mesma vacina em vários animais de uma só vez',    Icon: Syringe,        accent: 'text-blue-400',    ring: 'hover:border-blue-500/40' },
  { key: 'movimentacao', label: 'Movimentação em Lote', desc: 'Transferir vários animais para outro pasto de uma só vez',    Icon: ArrowLeftRight, accent: 'text-amber-400',   ring: 'hover:border-amber-500/40' },
];

const hoje = () => new Date().toISOString().split('T')[0];
const fmtDate = (d: string) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

export function ManejoClient({ pastures, allPastures, animals }: Props) {
  const [mode, setMode]       = useState<Mode>('conferencia');
  const [step, setStep]       = useState<Step>('mode');
  const [pasture, setPasture] = useState<Pasture | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filtroCat, setFiltroCat] = useState('');

  // conferência
  const [newAnimals, setNewAnimals] = useState<NewAnimal[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTag, setNewTag] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // vacinação
  const [vacina, setVacina] = useState('');
  const [dataVac, setDataVac] = useState(hoje());
  const [obsVac, setObsVac] = useState('');

  // movimentação
  const [destinoId, setDestinoId] = useState('');
  const [dataMov, setDataMov] = useState(hoje());

  const modeInfo = MODES.find(m => m.key === mode)!;

  const pastureAnimals = useMemo(
    () => (pasture ? animals.filter(a => a.currentPastureId === pasture.id) : []),
    [animals, pasture],
  );
  const categorias = useMemo(
    () => [...new Set(pastureAnimals.map(a => a.category))].sort(),
    [pastureAnimals],
  );

  const visiveis   = filtroCat ? pastureAnimals.filter(a => a.category === filtroCat) : pastureAnimals;
  const escolhidos = pastureAnimals.filter(a => selected.has(a.id));
  const ausentes   = pastureAnimals.filter(a => !selected.has(a.id));
  const destino    = allPastures.find(p => String(p.id) === destinoId);

  function resetAll() {
    setSelected(new Set());
    setNewAnimals([]);
    setShowNewForm(false);
    setNewTag('');
    setVacina('');
    setDataVac(hoje());
    setObsVac('');
    setDestinoId('');
    setDataMov(hoje());
    setFiltroCat('');
  }

  function pickMode(m: Mode) {
    setMode(m);
    setPasture(null);
    resetAll();
    setStep('pasture');
  }

  function openPasture(p: Pasture) {
    setPasture(p);
    resetAll();
    setStep('select');
  }

  const toggle = (id: number) => setSelected(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  const todosMarcados = visiveis.length > 0 && visiveis.every(a => selected.has(a.id));
  const toggleTodos = () => setSelected(prev => {
    const s = new Set(prev);
    if (todosMarcados) visiveis.forEach(a => s.delete(a.id));
    else visiveis.forEach(a => s.add(a.id));
    return s;
  });

  function addNewAnimal() {
    const tag = newTag.trim();
    if (!tag) return;
    setNewAnimals(prev => [...prev, { tempId: `new-${Date.now()}`, tagNumber: tag }]);
    setNewTag('');
    setShowNewForm(false);
  }

  const totalConf = escolhidos.length + newAnimals.length;

  const podeAvancar =
    mode === 'conferencia'  ? totalConf > 0
  : mode === 'vacinacao'    ? escolhidos.length > 0 && vacina.trim() !== '' && dataVac !== ''
  : /* movimentacao */        escolhidos.length > 0 && destinoId !== '' && dataMov !== '';

  const motivoBloqueio =
    escolhidos.length === 0 && totalConf === 0 ? 'Selecione ao menos um animal'
  : mode === 'vacinacao'    && vacina.trim() === '' ? 'Informe a vacina aplicada'
  : mode === 'movimentacao' && destinoId === ''     ? 'Escolha o pasto de destino'
  : '';

  function handleSave() {
    const msg =
      mode === 'conferencia'
        ? `Seriam confirmados ${totalConf} animais no ${pasture?.name}` +
          (ausentes.length ? ` e apontados ${ausentes.length} como não encontrados.` : '.')
      : mode === 'vacinacao'
        ? `Seriam registrados ${escolhidos.length} animais com a vacina "${vacina}" em ${fmtDate(dataVac)}.`
        : `Seriam movidos ${escolhidos.length} animais de ${pasture?.name} para ${destino?.name} em ${fmtDate(dataMov)}.`;
    alert(`Demonstração — nada é salvo ainda.\n\n${msg}`);
  }

  /* ══════════════ Barra de modo ══════════════ */
  const ModeBar = () => (
    <div className="flex flex-wrap gap-1.5 rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-1.5">
      {MODES.map(m => {
        const active = m.key === mode;
        return (
          <button key={m.key} onClick={() => pickMode(m.key)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              active ? `bg-zinc-800 ${m.accent}` : 'text-zinc-500 hover:bg-zinc-800/60 hover:text-zinc-300'
            }`}>
            <m.Icon size={15} />
            {m.label}
          </button>
        );
      })}
    </div>
  );

  /* ══════════════ STEP: escolha do modo ══════════════ */
  if (step === 'mode') {
    return (
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">O que você quer fazer?</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {MODES.map(m => (
            <button key={m.key} onClick={() => pickMode(m.key)}
              className={`group rounded-xl border border-zinc-800/60 bg-zinc-900/60 p-5 text-left transition-all duration-200 hover:bg-zinc-900/80 ${m.ring}`}>
              <m.Icon size={22} className={`${m.accent} mb-3`} />
              <p className="text-sm font-semibold text-white">{m.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ══════════════ STEP: escolha do pasto ══════════════ */
  if (step === 'pasture') {
    return (
      <div className="space-y-4">
        <ModeBar />
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">Selecione o pasto</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {pastures.map(p => (
            <button key={p.id} onClick={() => openPasture(p)}
              className="group flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/60 p-4 text-left transition-all duration-200 hover:border-emerald-500/40 hover:bg-zinc-900/80">
              <div>
                <p className="text-sm font-medium text-white transition-colors group-hover:text-emerald-400">{p.name}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{p.count} {p.count === 1 ? 'animal' : 'animais'}</p>
              </div>
              <ChevronRight size={16} className="text-zinc-600 transition-colors group-hover:text-emerald-500" />
            </button>
          ))}
        </div>
        {pastures.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500">Nenhum pasto com animais ativos.</p>
        )}
      </div>
    );
  }

  /* ══════════════ STEP: confirmação ══════════════ */
  if (step === 'confirm') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('select')} className="text-zinc-400 transition-colors hover:text-white">
            <ArrowLeft size={18} />
          </button>
          <modeInfo.Icon size={18} className={modeInfo.accent} />
          <span className="font-medium text-white">{pasture?.name} — Confirmação</span>
        </div>

        {/* Resumo */}
        {mode === 'vacinacao' && (
          <div className="rounded-xl border border-blue-800/40 bg-blue-950/20 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Vacina</p>
                <p className="mt-1 text-lg font-bold text-white">{vacina}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Data</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-white">{fmtDate(dataVac)}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Animais</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-blue-400">{escolhidos.length}</p>
              </div>
            </div>
            {obsVac && (
              <div className="mt-4 border-t border-blue-900/40 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Observação</p>
                <p className="mt-1 text-sm text-zinc-300">{obsVac}</p>
              </div>
            )}
          </div>
        )}

        {mode === 'movimentacao' && (
          <div className="rounded-xl border border-amber-800/40 bg-amber-950/20 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">De</p>
                <p className="mt-1 text-lg font-bold text-white">{pasture?.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Para</p>
                <p className="mt-1 text-lg font-bold text-amber-400">{destino?.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Animais · Data</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-white">
                  {escolhidos.length} · {fmtDate(dataMov)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Lista principal */}
        <div className="overflow-hidden rounded-xl border border-emerald-800/40">
          <div className="flex items-center justify-between border-b border-emerald-800/30 bg-emerald-950/30 px-4 py-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              {mode === 'conferencia' ? 'Confirmados no pasto'
               : mode === 'vacinacao' ? 'Receberão o registro da vacina'
               : 'Serão movidos'}
            </span>
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
              {mode === 'conferencia' ? totalConf : escolhidos.length}
            </span>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-emerald-900/30">
              {escolhidos.map(a => (
                <tr key={a.id} className="bg-emerald-950/20">
                  <td className="px-4 py-2.5 font-mono font-semibold text-emerald-300">
                    {a.tagNumber ? `#${a.tagNumber}` : <span className="italic font-normal text-zinc-500">sem brinco</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[a.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
                      {a.category}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs font-medium text-emerald-500">
                    {mode === 'conferencia' ? 'Presente'
                     : mode === 'vacinacao' ? `${vacina} · ${fmtDate(dataVac)}`
                     : `→ ${destino?.name}`}
                  </td>
                </tr>
              ))}
              {mode === 'conferencia' && newAnimals.map(a => (
                <tr key={a.tempId} className="bg-blue-950/30">
                  <td className="px-4 py-2.5 font-mono font-semibold text-blue-300">#{a.tagNumber}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">—</span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="rounded border border-blue-500/20 bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-400">
                      Novo Animal
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ausentes — só na conferência */}
        {mode === 'conferencia' && ausentes.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-red-800/40">
            <div className="flex items-center justify-between border-b border-red-800/30 bg-red-950/20 px-4 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-400">Não encontrados</span>
              <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400">{ausentes.length}</span>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-red-900/30">
                {ausentes.map(a => (
                  <tr key={a.id} className="bg-red-950/20">
                    <td className="px-4 py-2.5 font-mono font-semibold text-red-300">
                      {a.tagNumber ? `#${a.tagNumber}` : <span className="italic font-normal text-zinc-500">sem brinco</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[a.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
                        {a.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-medium text-red-400">Ausente</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {mode === 'vacinacao' && (
          <p className="text-xs text-zinc-500">
            O registro é gravado individualmente na ficha de cada animal, como se tivesse sido feito um a um.
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          <button onClick={() => setStep('select')}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-all hover:border-zinc-600 hover:text-white">
            Voltar
          </button>
          <button onClick={handleSave}
            className="rounded-lg border border-emerald-700/50 bg-emerald-500/20 px-5 py-2 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/30">
            {mode === 'conferencia' ? 'Salvar conferência'
             : mode === 'vacinacao' ? 'Registrar vacinação'
             : 'Confirmar movimentação'}
          </button>
        </div>
      </div>
    );
  }

  /* ══════════════ STEP: seleção ══════════════ */
  return (
    <div className="space-y-4">
      <ModeBar />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('pasture')} className="text-zinc-400 transition-colors hover:text-white">
            <ArrowLeft size={18} />
          </button>
          <span className="font-medium text-white">{pasture?.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            {mode === 'conferencia' ? totalConf : escolhidos.length} de {pastureAnimals.length} selecionados
          </span>
          {mode === 'conferencia' && (
            <button onClick={() => { setShowNewForm(v => !v); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-all hover:bg-blue-500/20">
              <Plus size={13} /> Novo Animal
            </button>
          )}
        </div>
      </div>

      {/* Novo animal (conferência) */}
      {mode === 'conferencia' && showNewForm && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-800/40 bg-blue-950/20 px-4 py-3">
          <span className="shrink-0 text-xs font-medium text-blue-400">Brinco:</span>
          <input ref={inputRef} value={newTag} onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addNewAnimal(); if (e.key === 'Escape') setShowNewForm(false); }}
            placeholder="ex: 42"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none" />
          <button onClick={addNewAnimal}
            className="rounded-lg border border-blue-500/30 bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-400 transition-all hover:bg-blue-500/30">
            Adicionar
          </button>
          <button onClick={() => setShowNewForm(false)}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 transition-all hover:text-white">
            Cancelar
          </button>
        </div>
      )}

      {/* Campos da vacinação */}
      {mode === 'vacinacao' && (
        <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2">
            <Syringe size={15} className="text-blue-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Dados da aplicação</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Vacina aplicada *</label>
              <input value={vacina} onChange={e => setVacina(e.target.value)} placeholder="Ex: Aftosa"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none" />
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                {VACINAS_SUGERIDAS.map(v => (
                  <button key={v} onClick={() => setVacina(v)}
                    className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
                      vacina === v ? 'border-blue-500/30 bg-blue-500/15 text-blue-300'
                                   : 'border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}>{v}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs text-zinc-400"><CalendarDays size={12} /> Data da aplicação *</label>
              <input type="date" value={dataVac} onChange={e => setDataVac(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none" />
              <label className="block pt-2 text-xs text-zinc-400">Observação (opcional)</label>
              <input value={obsVac} onChange={e => setObsVac(e.target.value)} placeholder="Ex: campanha de julho, lote 4432"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none" />
            </div>
          </div>
        </div>
      )}

      {/* Campos da movimentação */}
      {mode === 'movimentacao' && (
        <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-2">
            <ArrowLeftRight size={15} className="text-amber-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">Destino da movimentação</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Mover para *</label>
              <select value={destinoId} onChange={e => setDestinoId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none">
                <option value="">Selecione o pasto de destino…</option>
                {allPastures.filter(p => p.id !== pasture?.id).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs text-zinc-400"><CalendarDays size={12} /> Data da mudança *</label>
              <input type="date" value={dataMov} onChange={e => setDataMov(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none" />
            </div>
          </div>
        </div>
      )}

      {/* Filtros + selecionar todos */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => setFiltroCat('')}
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
              filtroCat === '' ? 'border-zinc-600 bg-zinc-700 text-white'
                               : 'border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
            }`}>
            Todos ({pastureAnimals.length})
          </button>
          {categorias.map(cat => (
            <button key={cat} onClick={() => setFiltroCat(cat)}
              className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                filtroCat === cat ? 'border-zinc-600 bg-zinc-700 text-white'
                                  : 'border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
              }`}>
              {cat} ({pastureAnimals.filter(a => a.category === cat).length})
            </button>
          ))}
        </div>
        <button onClick={toggleTodos}
          className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/20">
          {todosMarcados ? 'Desmarcar todos' : 'Selecionar todos'}
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="w-[12%] px-4 py-2.5 text-center">Sel.</th>
              <th className="px-4 py-2.5 text-left">Brinco</th>
              <th className="px-4 py-2.5 text-left">Categoria</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {visiveis.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-zinc-500">Nenhum animal nesta categoria.</td></tr>
            )}
            {visiveis.map(a => {
              const sel = selected.has(a.id);
              return (
                <tr key={a.id} onClick={() => toggle(a.id)}
                  className={`cursor-pointer transition-colors ${sel ? 'bg-emerald-950/40' : 'hover:bg-zinc-800/40'}`}>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                      sel ? 'border-emerald-400 bg-emerald-500' : 'border-zinc-600'
                    }`}>
                      {sel && <Check size={13} className="text-white" strokeWidth={3} />}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-mono font-semibold ${sel ? 'text-emerald-300' : 'text-white'}`}>
                    {a.tagNumber ?? <span className="italic font-normal text-zinc-500">sem brinco</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[a.category] ?? 'bg-zinc-700 text-zinc-300'}`}>
                      {a.category}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Rodapé */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <button onClick={() => setStep('pasture')}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-all hover:border-zinc-600 hover:text-white">
          Voltar
        </button>
        <div className="flex items-center gap-3">
          {!podeAvancar && motivoBloqueio && (
            <span className="text-xs text-zinc-600">{motivoBloqueio}</span>
          )}
          <button onClick={() => setStep('confirm')} disabled={!podeAvancar}
            className="rounded-lg border border-emerald-700/50 bg-emerald-500/20 px-5 py-2 text-sm font-medium text-emerald-400 transition-all hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-emerald-500/20">
            Ver resultado ({mode === 'conferencia' ? totalConf : escolhidos.length})
          </button>
        </div>
      </div>
    </div>
  );
}
