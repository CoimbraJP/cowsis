'use client';

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()}
      className="no-print h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-4 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700">
      Imprimir / PDF
    </button>
  );
}
