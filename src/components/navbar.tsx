'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, PersonStanding, LineChart, Settings, Sun, Moon, ChevronDown, Stethoscope, MessagesSquare, FileText } from 'lucide-react';
import { useTheme } from './theme-provider';
import { OfflineStatus } from './offline-status';
import { LoginButton } from './login-button';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/assessments', label: 'Assessments', icon: ClipboardList },
  { href: '/body', label: 'Body Explorer', icon: PersonStanding },
  { href: '/insights', label: 'Insights', icon: LineChart },
  { href: '/medical-tests', label: 'Medical Tests', icon: Stethoscope },
  { href: '/assistant', label: 'AI Assistant', icon: MessagesSquare },
];

const MORE = [
  { href: '/report', label: 'Medical Report', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [moreOpen, setMoreOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-orbit-border/60 bg-orbit-bg/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2.5" aria-label="Main">
        <Link href="/" className="flex items-center gap-2.5 mr-4 shrink-0">
          <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-orbit-cyan/50 shadow-glow-sm">
            <span className="absolute h-3 w-3 rounded-full bg-orbit-cyan shadow-glow" />
            <span className="absolute h-7 w-7 rounded-full border border-orbit-cyan/40" />
          </span>
          <span className="leading-tight">
            <span className="block font-bold tracking-widest text-orbit-cyan">ASTROGALEN</span>
            <span className="block text-[10px] text-orbit-muted -mt-0.5">Astronaut Health & Wellness</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1 flex-1">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                pathname === href ? 'bg-orbit-cyan/15 text-orbit-cyan' : 'text-orbit-muted hover:text-orbit-text hover:bg-orbit-cyan/5',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <div className="relative">
            <button
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-orbit-muted hover:text-orbit-text hover:bg-orbit-cyan/5"
            >
              More <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {moreOpen && (
              <div className="absolute right-0 mt-1 w-44 panel p-1.5 z-50" onMouseLeave={() => setMoreOpen(false)}>
                {MORE.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                      pathname === href ? 'bg-orbit-cyan/15 text-orbit-cyan' : 'hover:bg-orbit-cyan/10',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile: compact icon row */}
        <div className="flex md:hidden items-center gap-0.5 flex-1 justify-end">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={pathname === href ? 'page' : undefined}
              className={cn('p-2 rounded-lg', pathname === href ? 'bg-orbit-cyan/15 text-orbit-cyan' : 'text-orbit-muted')}
            >
              <Icon className="h-5 w-5" />
            </Link>
          ))}
          <Link href="/report" aria-label="Medical Report" className="p-2 rounded-lg text-orbit-muted">
            <FileText className="h-5 w-5" />
          </Link>
          <Link href="/settings" aria-label="Settings" className="p-2 rounded-lg text-orbit-muted">
            <Settings className="h-5 w-5" />
          </Link>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <OfflineStatus className="hidden sm:inline-flex" />
          <LoginButton />
          <button
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-orbit-border text-orbit-text hover:bg-orbit-cyan/10 transition"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </nav>
    </header>
  );
}
