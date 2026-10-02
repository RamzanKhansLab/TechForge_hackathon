import React from 'react';

/**
 * Pure SVG Dumbbell Chart (Claimed Years vs Verified Years)
 * Shows candidate resume claimed experience vs verifiable GitHub commit history.
 * Section B styling: hairline rules, Fraunces serif labels, IBM Plex Mono values.
 */
export default function DumbbellChart({ skills = [] }) {
  // Filter skills that have claimed years or verified years
  const plotted = skills
    .filter(s => (s.claimedYears && s.claimedYears > 0) || (s.verifiedYears && s.verifiedYears > 0))
    .slice(0, 10); // Top 10 skills

  if (plotted.length === 0) {
    return (
      <div className="p-5 border border-[var(--color-rule,#ded7c8)] bg-[var(--color-paper,#FAF7F0)] text-xs text-[var(--color-ink-2,#4a443b)] font-mono">
        Zero stated years in resume sections or verified commit range to plot.
      </div>
    );
  }

  const rowHeight = 36;
  const topPad = 32;
  const bottomPad = 24;
  const leftPad = 130;
  const rightPad = 40;
  const width = 580;
  const height = topPad + plotted.length * rowHeight + bottomPad;

  // Max years on scale (default min 6 years)
  const maxYearsVal = Math.max(
    6,
    ...plotted.map(s => Math.max(s.claimedYears || 0, s.verifiedYears || 0))
  );
  const maxYears = Math.ceil(maxYearsVal) + 1;

  const scaleX = (years) => {
    const clamped = Math.max(0, Math.min(years, maxYears));
    return leftPad + (clamped / maxYears) * (width - leftPad - rightPad);
  };

  // Generate grid ticks (e.g. 0, 2, 4, 6, 8 yrs)
  const ticks = [];
  const step = maxYears <= 6 ? 1 : 2;
  for (let yr = 0; yr <= maxYears; yr += step) {
    ticks.push(yr);
  }

  return (
    <div className="panel p-6 border border-[var(--color-rule,#ded7c8)] bg-[var(--color-card,#FAF7F0)]">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <div>
          <h3 className="font-serif text-base font-bold text-[var(--color-ink,#1a1815)]">
            Experience Ledger: Claimed vs. Verified
          </h3>
          <p className="text-xs font-sans text-[var(--color-ink-2,#4a443b)] mt-0.5">
            Compares stated resume duration against public commit timestamp horizons.
          </p>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full border border-[var(--color-ink-2,#4a443b)] bg-[var(--color-rule,#ded7c8)]" />
            <span className="text-[var(--color-ink-2,#4a443b)]">Claimed (Resume)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#2e6b3e]" />
            <span className="text-[#1c4728] font-semibold">Verified (GitHub)</span>
          </span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[500px] text-[11px] font-mono select-none"
        >
          {/* Axis grid lines */}
          {ticks.map(yr => {
            const x = scaleX(yr);
            return (
              <g key={`tick-${yr}`}>
                <line
                  x1={x}
                  y1={topPad - 8}
                  x2={x}
                  y2={height - bottomPad}
                  stroke="var(--color-rule, #ded7c8)"
                  strokeDasharray="2,2"
                />
                <text
                  x={x}
                  y={topPad - 12}
                  textAnchor="middle"
                  fill="var(--color-ink-2, #4a443b)"
                  fontSize={10}
                >
                  {yr}y
                </text>
              </g>
            );
          })}

          {/* Skill dumbbell rows */}
          {plotted.map((skill, index) => {
            const y = topPad + index * rowHeight + rowHeight / 2;
            const claimed = skill.claimedYears || 0;
            const verified = skill.verifiedYears || 0;
            const xClaimed = scaleX(claimed);
            const xVerified = scaleX(verified);
            const xMin = Math.min(xClaimed, xVerified);
            const xMax = Math.max(xClaimed, xVerified);
            const isMatch = Math.abs(claimed - verified) < 0.5;

            return (
              <g key={skill.id || skill.name} className="group">
                {/* Skill Name */}
                <text
                  x={leftPad - 12}
                  y={y + 4}
                  textAnchor="end"
                  fill="var(--color-ink, #1a1815)"
                  className="font-sans font-medium text-xs"
                >
                  {skill.name}
                </text>

                {/* Connecting bar */}
                <line
                  x1={xMin}
                  y1={y}
                  x2={xMax}
                  y2={y}
                  stroke={claimed > verified ? '#c97a1e' : 'var(--color-rule, #ded7c8)'}
                  strokeWidth={2.5}
                />

                {/* Claimed circle */}
                <circle
                  cx={xClaimed}
                  cy={y}
                  r={4.5}
                  fill="var(--color-paper, #FAF7F0)"
                  stroke="var(--color-ink-2, #4a443b)"
                  strokeWidth={2}
                />

                {/* Verified circle */}
                <circle
                  cx={xVerified}
                  cy={y}
                  r={4.5}
                  fill="#2e6b3e"
                  stroke="#1c4728"
                  strokeWidth={1.5}
                />

                {/* Delta / Value label */}
                <text
                  x={xMax + 8}
                  y={y + 3.5}
                  fill="var(--color-ink-2, #4a443b)"
                  fontSize={10}
                  className="font-mono"
                >
                  {isMatch ? `${verified}y` : `${verified}y / ${claimed}y`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
