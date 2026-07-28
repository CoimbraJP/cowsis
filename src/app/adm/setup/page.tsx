import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getDatabaseCounts } from '../setup-actions';
import { SetupClient } from '../SetupClient';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const counts = await getDatabaseCounts();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/adm" className="text-zinc-500 transition-colors hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white">Carga inicial do sistema</h1>
          <span className="rounded border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-400">
            ADM
          </span>
        </div>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-500">
          Zere os dados de teste e importe a planilha do cliente para criar os pastos e o rebanho inicial.
          Esta página não aparece no menu — o acesso é só por esta URL.
        </p>
      </header>

      <SetupClient counts={counts} />
    </div>
  );
}
