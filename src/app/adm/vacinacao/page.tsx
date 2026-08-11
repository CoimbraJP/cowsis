import { redirect } from 'next/navigation';

// A vacinação em lote agora faz parte da tela unificada de Manejo em Lote.
export default function VacinacaoPage() {
  redirect('/adm');
}
