'use client';

// Stylized front-facing human figure built from SVG primitives, with clickable,
// keyboard-accessible organ hotspots. Organs glow neon-cyan on hover/selection.
import * as React from 'react';
import { ORGANS } from '@/lib/body-data';
import { cn } from '@/lib/utils';

export function InteractiveHumanBody({
  selected,
  onSelect,
  className,
}: {
  selected: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
}) {
  const handleKey = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(selected === id ? null : id);
    }
  };

  const organProps = (id: string, label: string) => ({
    className: 'organ',
    'data-organ': id,
    'data-selected': selected === id ? 'true' : 'false',
    role: 'button',
    tabIndex: 0,
    'aria-label': `${label} — open information panel`,
    onClick: () => onSelect(selected === id ? null : id),
    onKeyDown: (e: React.KeyboardEvent) => handleKey(e, id),
  });

  return (
    <svg
      viewBox="0 0 300 640"
      className={cn('w-full max-w-sm mx-auto select-none', className)}
      aria-label="Interactive human body diagram. Use Tab to move between body systems and Enter to open details."
      role="img"
    >
      {/* Silhouette (skin system hotspot — stroke-only so organs stay clickable) */}
      <g {...organProps('skin', ORGANS.skin.name)}>
        <g fill="none" stroke="rgb(var(--orbit-cyan) / 0.55)" strokeWidth="3" pointerEvents="visiblePainted">
          {/* head + body outline */}
          <circle cx="150" cy="52" r="31" className="body-silhouette" style={{ fill: 'rgb(var(--orbit-cyan) / 0.03)' }} />
          {/* neck */}
          <rect x="141" y="79" width="18" height="20" rx="6" className="body-silhouette" />
          {/* torso */}
          <path d="M116 98 Q150 88 184 98 L190 192 Q150 210 110 192 Z" className="body-silhouette" />
          <path d="M112 196 Q150 214 188 196 L183 292 Q150 306 117 292 Z" className="body-silhouette" />
          {/* arms */}
          <path d="M114 102 C96 118 86 160 82 210 C79 245 76 275 74 296 C72 312 88 316 92 300 C98 270 102 240 106 208" className="body-silhouette" />
          <path d="M186 102 C204 118 214 160 218 210 C221 245 224 275 226 296 C228 312 212 316 208 300 C202 270 198 240 194 208" className="body-silhouette" />
          {/* hands */}
          <circle cx="82" cy="308" r="10" className="body-silhouette" />
          <circle cx="218" cy="308" r="10" className="body-silhouette" />
          {/* legs */}
          <path d="M120 296 L118 460 L122 580 Q123 596 134 596 Q144 596 143 580 L143 460 L146 296" className="body-silhouette" />
          <path d="M180 296 L182 460 L178 580 Q177 596 166 596 Q156 596 157 580 L157 460 L154 296" className="body-silhouette" />
        </g>
      </g>

      {/* ===== Organs ===== */}

      {/* Brain */}
      <g {...organProps('brain', ORGANS.brain.name)}>
        <path
          d="M134 44 Q134 30 150 30 Q166 30 166 44 Q166 58 150 60 Q134 58 134 44 Z"
          fill="rgb(var(--orbit-violet) / 0.35)"
          stroke="rgb(var(--orbit-violet))"
          strokeWidth="1.5"
        />
        <path d="M143 34 Q146 42 143 52 M150 31 L150 58 M157 34 Q154 42 157 52" stroke="rgb(var(--orbit-bg))" strokeWidth="1.2" fill="none" opacity="0.7" />
      </g>

      {/* Eyes */}
      <g {...organProps('eyes', ORGANS.eyes.name)}>
        <circle cx="139" cy="57" r="4.5" fill="rgb(var(--orbit-cyan) / 0.5)" stroke="rgb(var(--orbit-cyan))" strokeWidth="1.5" />
        <circle cx="161" cy="57" r="4.5" fill="rgb(var(--orbit-cyan) / 0.5)" stroke="rgb(var(--orbit-cyan))" strokeWidth="1.5" />
      </g>

      {/* Heart (viewer-right = anatomical left) */}
      <g {...organProps('heart', ORGANS.heart.name)}>
        <path
          d="M158 150 C164 143 175 147 175 158 C175 171 164 179 158 184 C152 179 141 171 141 158 C141 147 152 143 158 150 Z"
          fill="rgb(var(--orbit-red) / 0.30)"
          stroke="rgb(var(--orbit-red))"
          strokeWidth="1.6"
        />
      </g>

      {/* Lungs */}
      <g {...organProps('lungs', ORGANS.lungs.name)}>
        <path d="M132 126 Q118 128 116 150 Q114 174 124 186 Q134 190 138 178 L140 140 Q140 126 132 126 Z" fill="rgb(var(--orbit-blue) / 0.25)" stroke="rgb(var(--orbit-blue))" strokeWidth="1.5" />
        <path d="M168 126 Q182 128 184 150 Q186 174 176 186 Q166 190 162 178 L160 140 Q160 126 168 126 Z" fill="rgb(var(--orbit-blue) / 0.25)" stroke="rgb(var(--orbit-blue))" strokeWidth="1.5" />
        <path d="M150 132 L150 168" stroke="rgb(var(--orbit-blue))" strokeWidth="2.4" strokeLinecap="round" />
      </g>

      {/* Digestive system */}
      <g {...organProps('digestive', ORGANS.digestive.name)}>
        <ellipse cx="139" cy="208" rx="19" ry="10" fill="rgb(var(--orbit-green) / 0.28)" stroke="rgb(var(--orbit-green))" strokeWidth="1.4" />
        <ellipse cx="162" cy="203" rx="8" ry="9" fill="rgb(var(--orbit-green) / 0.28)" stroke="rgb(var(--orbit-green))" strokeWidth="1.4" />
        <path
          d="M128 222 h44 v34 h-44 v-26 h36 v18 h-28"
          fill="none"
          stroke="rgb(var(--orbit-green))"
          strokeWidth="7"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity="0.75"
        />
      </g>

      {/* Immune system nodes */}
      <g {...organProps('immune', ORGANS.immune.name)}>
        {[
          [150, 92],
          [112, 132],
          [188, 132],
          [126, 290],
          [174, 290],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="5.5" fill="rgb(var(--orbit-green) / 0.45)" stroke="rgb(var(--orbit-green))" strokeWidth="1.3" />
        ))}
      </g>

      {/* Bones (spine + femurs + ribs) */}
      <g {...organProps('bones', ORGANS.bones.name)}>
        <rect x="146" y="99" width="8" height="185" rx="4" fill="rgb(var(--orbit-amber) / 0.4)" stroke="rgb(var(--orbit-amber))" strokeWidth="1.2" />
        <path d="M124 122 Q150 116 176 122 M122 136 Q150 130 178 136 M122 150 Q150 144 178 150" fill="none" stroke="rgb(var(--orbit-amber))" strokeWidth="2.4" opacity="0.65" />
        <rect x="128" y="320" width="7" height="150" rx="3.5" fill="rgb(var(--orbit-amber) / 0.35)" stroke="rgb(var(--orbit-amber))" strokeWidth="1.2" />
        <rect x="165" y="320" width="7" height="150" rx="3.5" fill="rgb(var(--orbit-amber) / 0.35)" stroke="rgb(var(--orbit-amber))" strokeWidth="1.2" />
      </g>

      {/* Muscles */}
      <g {...organProps('muscles', ORGANS.muscles.name)}>
        <ellipse cx="97" cy="165" rx="9" ry="24" fill="rgb(var(--orbit-red) / 0.28)" stroke="rgb(var(--orbit-red))" strokeWidth="1.2" transform="rotate(14 97 165)" />
        <ellipse cx="203" cy="165" rx="9" ry="24" fill="rgb(var(--orbit-red) / 0.28)" stroke="rgb(var(--orbit-red))" strokeWidth="1.2" transform="rotate(-14 203 165)" />
        <ellipse cx="133" cy="380" rx="10" ry="32" fill="rgb(var(--orbit-red) / 0.28)" stroke="rgb(var(--orbit-red))" strokeWidth="1.2" />
        <ellipse cx="167" cy="380" rx="10" ry="32" fill="rgb(var(--orbit-red) / 0.28)" stroke="rgb(var(--orbit-red))" strokeWidth="1.2" />
      </g>
    </svg>
  );
}
