'use client';

import * as React from 'react';

export function PWARegister() {
  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration is best-effort; app works without it.
      });
    }
  }, []);
  return null;
}
