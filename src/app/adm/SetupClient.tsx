'use client';

import { useState, useTransition, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  resetDatabase, validarImportacao, executarImportacao,
  type ImportPreview, type ParsedRow,
} from './setup-actions';

type Counts = Record<string, number>;

export function SetupClient({ counts }: { counts: Counts }) {
  const [pending, startTransition] = useTransition();

  /* ── Reset ── */
  const [confirmText, setConfirmText] = useState('');
  const [resetMsg, setResetMsg] = useState<{ ok: boolean; text: string } | null>(null);

  /* ── Import ── */
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [reading, setReading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalAtual = Object.values(counts).reduce((s, n) => s + n, 0);
  const bancoVazio = totalAtual === 0;

  function handleReset() {
    if (confirmText.trim().toUpperCase() !== 'APAGAR TUDO') {
      setResetMsg({ ok: false, text: 'Digite exatamente APAGAR TUDO para liberar a ação.' });
      return;
    }
    if (!confirm('Última confirmação: TODOS os dados serão apagados permanentemente. Continuar?')) return;

    startTransition(async () => {
      const r = await resetDatabase(confirmText);
      setResetMsg({ ok: r.ok, text: r.message });
      if (r.ok) { setConfirmText(''); setTimeout(() => window.location.reload(), 1200); }
    });
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setPreview(null);
    setImportMsg(null);
    setReading(true);

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });

      // Procura a aba ANIMAIS; se não achar, usa a primeira
      const sheetName = wb.SheetNames.find(n => n.trim().toUpperCase().startsWith('ANIMA')) ?? wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const raw = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

      if (raw.length === 0) {
        setImportMsg({ ok: false, text: `A aba "${sheetName}" está vazia.` });
        setReading(false);
        return;
      }

      startTransition(async () => {
        const p = await validarImportacao(raw);
        setPreview(p);
        setReading(false);
      });
    } catch (err) {
      setImportMsg({ ok: false, text: 'Não foi possível ler o arquivo. Confirme que é um .xlsx válido.' });
      setReading(false);
    }
  }

  function handleImport() {
    if (!preview?.ok) return;
    if (!confirm(`Importar ${preview.rows.length} animais em ${preview.pastos.length} pastos?`)) return;

    startTransition(async () => {
      const r = await executarImportacao(preview.rows as ParsedRow[]);
      setImportMsg({ ok: r.ok, text: r.ok
        ? `${r.message} ${r.pastosCriados} pastos e ${r.animaisCriados} animais criados.`
        : r.message });
      if (r.ok) { setPreview(null); setFileName(null);
        if (inputRef.current) inputRef.current.value = '';
        setTimeout(() => window.location.reload(), 1600); }
    });
  }

  const erros  = preview?.problems.filter(p => p.linha !== 0) ?? [];
  const avisos = preview?.problems.filter(p => p.linha === 0) ?? [];

  return (
    <div className="space-y-6">

      {/* ─── Estado atual do banco ─── */}
      <section className="rounded-xl border border-zinc-800/70 bg-zinc-900/40">
        <header className="border-b border-zinc-800/70 px-5 py-3.5">
          <h3 className="text-[15px] font-semibold text-white">Estado atual do banco</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {bancoVazio ? 'O banco está vazio e pronto para a carga inicial.' : `${totalAtual} registros no total.`}
          </p>
        </header>
        <div className="grid grid-cols-2 gap-2.5 px-5 py-4 sm:grid-cols-4 lg:grid-cols-7">
          {Object.entries(counts).map(([label, n]) => (
            <div key={label} className="rounded-lg border border-zinc-800/70 bg-zinc-950/40 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase leading-tight tracking-[0.08em] text-zinc-500">{label}</p>
              <p className={`mt-1.5 text-xl font-bold leading-none tabular-nums ${n > 0 ? 'text-white' : 'text-zinc-700'}`}>{n}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Passo 1: baixar modelo ─── */}
      <section className="rounded-xl border border-zinc-800/70 bg-zinc-900/40">
        <header className="border-b border-zinc-800/70 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-bold text-zinc-400">1</span>
            <h3 className="text-[15px] font-semibold text-white">Enviar o modelo para o cliente</h3>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">Planilha com as colunas certas e uma aba de instruções.</p>
        </header>
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <a href="/modelo-importacao.xlsx" download
            className="rounded-lg border border-emerald-700/50 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20">
            Baixar planilha modelo
          </a>
          <p className="text-xs text-zinc-500">
            Colunas: <span className="text-zinc-400">Brinco · Categoria · Pasto · Peso (kg) · Prenha · Observações</span>
          </p>
        </div>
      </section>

      {/* ─── Passo 2: zerar ─── */}
      <section className="rounded-xl border border-red-900/40 bg-zinc-900/40">
        <header className="border-b border-red-900/30 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/15 text-[11px] font-bold text-red-400">2</span>
            <h3 className="text-[15px] font-semibold text-red-300">Zerar o banco de dados</h3>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">
            Apaga animais, pastos, movimentações, inseminações, nascimentos, composições e histórico. Não tem como desfazer.
          </p>
        </header>
        <div className="space-y-3 px-5 py-4">
          <div className="rounded-lg border border-red-900/30 bg-red-950/20 px-4 py-3">
            <p className="text-xs leading-relaxed text-red-300/90">
              Faça o backup em Excel antes (Relatórios → Excel completo). Depois de confirmar, os dados não voltam.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1 space-y-1">
              <label className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                Digite <span className="font-mono text-red-400">APAGAR TUDO</span> para liberar
              </label>
              <input value={confirmText} onChange={e => setConfirmText(e.target.value)}
                placeholder="APAGAR TUDO" disabled={pending}
                className="h-9 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 font-mono text-sm text-white outline-none focus:border-red-500 disabled:opacity-50" />
            </div>
            <button onClick={handleReset}
              disabled={pending || confirmText.trim().toUpperCase() !== 'APAGAR TUDO'}
              className="h-9 rounded-lg bg-red-500/90 px-5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600">
              {pending ? 'Apagando…' : 'Zerar banco de dados'}
            </button>
          </div>
          {resetMsg && (
            <p className={`rounded-lg border px-4 py-2.5 text-sm ${resetMsg.ok
              ? 'border-emerald-800/50 bg-emerald-950/30 text-emerald-300'
              : 'border-red-900/50 bg-red-950/30 text-red-300'}`}>
              {resetMsg.text}
            </p>
          )}
        </div>
      </section>

      {/* ─── Passo 3: importar ─── */}
      <section className="rounded-xl border border-zinc-800/70 bg-zinc-900/40">
        <header className="border-b border-zinc-800/70 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/15 text-[11px] font-bold text-blue-400">3</span>
            <h3 className="text-[15px] font-semibold text-white">Importar a planilha preenchida</h3>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">Os pastos são criados automaticamente a partir da coluna Pasto.</p>
        </header>
        <div className="space-y-4 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} disabled={pending}
              className="block w-full max-w-md text-sm text-zinc-400 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-200 hover:file:bg-zinc-700" />
            {reading && <span className="text-xs text-zinc-500">Lendo arquivo…</span>}
          </div>

          {fileName && !reading && (
            <p className="text-xs text-zinc-500">Arquivo: <span className="text-zinc-300">{fileName}</span></p>
          )}

          {/* Pré-visualização */}
          {preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {[
                  { label: 'Linhas lidas', value: preview.totalLinhas, tone: 'text-white' },
                  { label: 'Animais válidos', value: preview.rows.length, tone: 'text-emerald-400' },
                  { label: 'Pastos a criar', value: preview.pastos.length, tone: 'text-teal-400' },
                  { label: 'Erros', value: erros.length, tone: erros.length > 0 ? 'text-red-400' : 'text-zinc-700' },
                ].map(s => (
                  <div key={s.label} className="rounded-lg border border-zinc-800/70 bg-zinc-950/40 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">{s.label}</p>
                    <p className={`mt-1.5 text-xl font-bold leading-none tabular-nums ${s.tone}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Erros bloqueantes */}
              {erros.length > 0 && (
                <div className="rounded-lg border border-red-900/40 bg-red-950/20">
                  <p className="border-b border-red-900/30 px-4 py-2.5 text-sm font-semibold text-red-300">
                    {erros.length} problema(s) precisam ser corrigidos na planilha
                  </p>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-red-950/40">
                        <tr className="text-[10px] uppercase tracking-[0.08em] text-red-400/80">
                          <th className="px-4 py-2 text-left">Linha</th>
                          <th className="px-4 py-2 text-left">Coluna</th>
                          <th className="px-4 py-2 text-left">Valor</th>
                          <th className="px-4 py-2 text-left">Problema</th>
                        </tr>
                      </thead>
                      <tbody>
                        {erros.slice(0, 100).map((p, i) => (
                          <tr key={i} className="border-t border-red-900/20">
                            <td className="px-4 py-1.5 tabular-nums text-red-300">{p.linha}</td>
                            <td className="px-4 py-1.5 text-zinc-400">{p.campo}</td>
                            <td className="px-4 py-1.5 font-mono text-xs text-zinc-300">{p.valor}</td>
                            <td className="px-4 py-1.5 text-xs text-zinc-400">{p.erro}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {erros.length > 100 && (
                    <p className="px-4 py-2 text-xs text-zinc-500">… e mais {erros.length - 100} problema(s).</p>
                  )}
                </div>
              )}

              {/* Avisos não bloqueantes */}
              {avisos.length > 0 && (
                <div className="space-y-1.5 rounded-lg border border-amber-900/40 bg-amber-950/15 px-4 py-3">
                  <p className="text-sm font-semibold text-amber-300">Avisos</p>
                  {avisos.map((a, i) => (
                    <p key={i} className="text-xs leading-relaxed text-amber-200/80">
                      <span className="font-mono">{a.valor}</span> — {a.erro}
                    </p>
                  ))}
                </div>
              )}

              {/* Resumo por pasto */}
              {preview.pastos.length > 0 && (
                <div className="rounded-lg border border-zinc-800/70">
                  <p className="border-b border-zinc-800/70 px-4 py-2.5 text-sm font-semibold text-white">
                    Pastos que serão criados
                  </p>
                  <div className="max-h-56 divide-y divide-zinc-800/50 overflow-y-auto">
                    {preview.pastos.map(p => (
                      <div key={p.nome} className="flex items-center justify-between px-4 py-2 text-sm">
                        <span className="truncate text-zinc-300">{p.nome}</span>
                        <span className="shrink-0 tabular-nums text-zinc-500">{p.quantidade} animais</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumo por categoria */}
              {preview.categorias.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {preview.categorias.map(c => (
                    <span key={c.nome} className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-1.5 text-xs text-zinc-300">
                      {c.nome} <span className="ml-1 font-semibold tabular-nums text-white">{c.quantidade}</span>
                    </span>
                  ))}
                </div>
              )}

              <button onClick={handleImport} disabled={pending || !preview.ok}
                className="h-10 w-full rounded-lg bg-emerald-500 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-600">
                {pending ? 'Importando…'
                  : preview.ok ? `Importar ${preview.rows.length} animais em ${preview.pastos.length} pastos`
                  : 'Corrija os erros da planilha para liberar a importação'}
              </button>
            </div>
          )}

          {importMsg && (
            <p className={`rounded-lg border px-4 py-2.5 text-sm ${importMsg.ok
              ? 'border-emerald-800/50 bg-emerald-950/30 text-emerald-300'
              : 'border-red-900/50 bg-red-950/30 text-red-300'}`}>
              {importMsg.text}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
