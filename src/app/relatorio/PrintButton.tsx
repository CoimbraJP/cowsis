'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors text-sm"
    >
      🖨️ Imprimir / Exportar PDF
    </button>
  );
}
