import React from 'react';

/**
 * Section B Verdict Stamp:
 * Inline SVG with double border, uppercase letter-spaced label, ink color per verdict,
 * rotated -2deg on large, with SVG feTurbulence ink texture filter.
 * Small size: no rotation (tables/inline).
 * Large size: rotated -2deg (drawers/overview).
 */
export function Stamp({ verdict, status, size = 'sm', className = '' }) {
  const rawVerdict = verdict || status || 'Proven';
  const vUpper = String(rawVerdict).toUpperCase().replace(/_/g, '-');
  
  const isProven = vUpper === 'PROVEN';
  const isPartial = vUpper === 'PARTIAL';

  const normVerdict = isProven ? 'PROVEN' : isPartial ? 'PARTIAL' : 'CLAIMED-ONLY';

  const color = isProven ? 'var(--color-proven)' : isPartial ? 'var(--color-partial)' : 'var(--color-claimed)';
  const bgColor = isProven ? 'var(--color-proven-bg)' : isPartial ? 'var(--color-partial-bg)' : 'var(--color-claimed-bg)';

  const filterId = `stamp-texture-${normVerdict.toLowerCase()}`;

  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center justify-center font-mono font-bold tracking-wider uppercase text-[10px] px-2 py-0.5 border ${className}`}
        style={{
          borderColor: color,
          color: color,
          backgroundColor: bgColor,
          borderWidth: '1.5px',
          borderRadius: '2px',
          lineHeight: '1.2'
        }}
      >
        {normVerdict}
      </span>
    );
  }

  // Large Stamp with double border & slight -2deg rotation
  return (
    <div
      className={`relative inline-block select-none transform -rotate-2 transition-transform duration-200 ${className}`}
      style={{ filter: `url(#${filterId})` }}
      aria-label={`Verdict: ${normVerdict}`}
    >
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <filter id={filterId} x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div
        className="px-4 py-1.5 border-[2px] font-mono font-bold text-xs uppercase tracking-widest"
        style={{
          borderColor: color,
          color: color,
          backgroundColor: bgColor,
          borderRadius: '2px',
          boxShadow: `inset 0 0 0 1px ${color}`
        }}
      >
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-1.5 rounded-full" style={{ backgroundColor: color }} />
          {normVerdict}
        </span>
      </div>
    </div>
  );
}
