import { Info } from 'lucide-react';

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`border border-orbit-amber/30 bg-orbit-amber/10 text-orbit-amber rounded-xl flex items-start gap-2 ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'}`}
      role="note"
    >
      <Info className="h-4 w-4 mt-0.5 shrink-0" />
      <p>
        AstroGalen provides health awareness and educational guidance. It is not a medical professional and does not replace an
        approved medical assessment.
      </p>
    </div>
  );
}
