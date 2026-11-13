import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { JourneyProvider } from '@/components/journey-provider';
import { Starfield } from '@/components/starfield';
import { Navbar } from '@/components/navbar';
import { OrbiAvatar } from '@/components/orbi-avatar';
import { PWARegister } from '@/components/pwa-register';
import { CoverScreen } from '@/components/cover-screen';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'AstroGalen — Astronaut Health & Wellness Companion',
  description:
    'Your personal health companion for every stage of space exploration. Automatic health monitoring, daily assessments, medical tests, contextual NASA research, and an offline AI assistant.',
  manifest: '/manifest.webmanifest',
  applicationName: 'AstroGalen',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'AstroGalen' },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/icon-192.png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#040816',
  width: 'device-width',
  initialScale: 1,
};

const themeInit = `(function(){try{var t=localStorage.getItem('orbit-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}if(t==='dark')document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <JourneyProvider>
            <Starfield />
            <PWARegister />
            <div className="min-h-dvh flex flex-col">
              <Navbar />
              <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 pb-28">{children}</main>
              <footer className="mx-auto w-full max-w-7xl px-4 pb-8 text-center text-xs text-orbit-muted">
                AstroGalen · NASA Space Apps Challenge 2026 · Health awareness software — not a medical diagnostic system
              </footer>
            </div>
            <OrbiAvatar />
            <CoverScreen />
          </JourneyProvider>
        </ThemeProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
