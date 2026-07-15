'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Trees, Beef, History, Syringe,
  BarChart3, CalendarDays, FileText, Skull, Baby,
} from 'lucide-react';

const NAV = [
  { href: '/',               label: 'Dashboard',      Icon: LayoutDashboard },
  { href: '/pastures',       label: 'Pastos',          Icon: Trees           },
  { href: '/animals',        label: 'Animais',         Icon: Beef            },
  { href: '/transactions',   label: 'Movimentações',   Icon: History         },
  { href: '/inseminations',  label: 'Inseminações',    Icon: Syringe         },
  { href: '/mortes',         label: 'Mortes',          Icon: Skull           },
  { href: '/nascimentos',    label: 'Nascimentos',     Icon: Baby            },
];

const REPORTS = [
  { href: '/relatorio',          label: 'Relatório PDF',     Icon: FileText    },
  { href: '/analise',            label: 'Análise por Data',  Icon: CalendarDays },
  { href: '/pastures/historico', label: 'Histórico',         Icon: BarChart3   },
];

function NavLink({ href, label, Icon }: { href: string; label: string; Icon: React.ElementType }) {
  const path = usePathname();
  const active = href === '/' ? path === '/' : path.startsWith(href);
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
        active
          ? 'bg-emerald-500/10 text-emerald-400 shadow-[inset_0_1px_0_rgba(52,211,153,0.08)]'
          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70'
      }`}
    >
      <Icon
        size={17}
        className={active ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300 transition-colors'}
      />
      <span className="flex-1">{label}</span>
      {active && (
        <span className="w-1 h-4 rounded-full bg-emerald-400 opacity-70" />
      )}
    </Link>
  );
}

export function NavMenu() {
  return (
    <nav className="flex-1 px-3 py-3 space-y-0.5 pb-8 overflow-y-auto">
      {NAV.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}

      <div className="pt-5 pb-1.5 px-3">
        <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.12em]">
          Relatórios
        </span>
      </div>

      {REPORTS.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
    </nav>
  );
}
