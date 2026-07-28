'use client';

import { useState } from 'react';

export function ExcelButton({ from, to, pastureId }: { from: string; to: string; pastureId: string }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const sp = new URLSearchParams({ from, to });
      if (pastureId) sp.set('pastureId', pastureId);
      const res = await fetch(`/relatorio/excel?${sp.toString()}`);
      if (!res.ok) throw new Error('Falha ao gerar a planilha');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-pecuaria-rs-${from}_a_${to}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Não foi possível gerar a planilha. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={download} disabled={busy}
      className="h-9 rounded-lg border border-emerald-700/50 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:opacity-50">
      {busy ? 'Gerando…' : 'Excel completo'}
    </button>
  );
}
