'use client';

import * as React from 'react';
import { Wifi, WifiOff, Database } from 'lucide-react';
import { Badge } from './ui/card';
import { cn } from '@/lib/utils';

export function useOnline(): boolean {
  const [online, setOnline] = React.useState(true);
  React.useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

export function OfflineStatus({ className }: { className?: string }) {
  const online = useOnline();
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    import('@/lib/db').then(async ({ db }) => {
      const s = await db.settings.get('main');
      if (mounted) setPending(s?.demoMode ?? false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Badge tone={online ? 'green' : 'amber'} className={cn('whitespace-nowrap', className)} title={online ? 'Connected — all data is still stored locally' : 'Offline — everything keeps working from local storage'}>
      {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
      {online ? 'Online' : 'Offline'}
      <span className="hidden lg:inline items-center gap-1 text-orbit-muted">
        · <Database className="h-3 w-3" /> Local
      </span>
    </Badge>
  );
}
