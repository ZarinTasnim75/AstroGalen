import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export const metadata = { title: 'Offline — AstroGalen' };

export default function OfflinePage() {
  return (
    <div className="panel p-8 max-w-md mx-auto mt-12 text-center">
      <WifiOff className="h-10 w-10 text-orbit-amber mx-auto mb-4" />
      <h1 className="text-xl font-bold">You are offline</h1>
      <p className="text-sm text-orbit-muted mt-2">
        This page is not in the offline cache yet. AstroGalen’s core features — monitoring, assessments, body explorer,
        insights, medical tests, the assistant and reports — keep working from local storage. Reconnect once to cache the
        full app.
      </p>
      <Link
        href="/assessments"
        className="inline-flex items-center gap-2 mt-6 rounded-xl bg-orbit-cyan px-4 py-2 font-semibold text-slate-950 shadow-glow-sm"
      >
        Go to Assessments
      </Link>
    </div>
  );
}
