import React from 'react';
import { ArrowUpRight, TrendingUp, Sparkles, CheckCircle2, History } from 'lucide-react';
import { formatDate } from '../../utils/format.js';
import { Stamp } from '../../ui/index.js';

/**
 * ReanalysisDiff
 * Compares current analysis against a prior baseline report:
 * Shows total score delta (+pts), newly proven skills, improved signals,
 * and chronological verification audit log.
 */
export default function ReanalysisDiff({ diff, onOpenDrawer }) {
  if (!diff) return null;

  const {
    previousDate,
    currentDate,
    scoreDelta = 0,
    newlyProvenCount = 0,
    newlyProven = [],
    improvedSkills = [],
    summaryDelta = {}
  } = diff;

  const isPositive = scoreDelta > 0;
  const isNeutral = scoreDelta === 0;

  return (
    <section className="panel p-6 border-2 border-[var(--color-rule,#ded7c8)] bg-[var(--color-card,#FAF7F0)] mb-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--color-rule,#ded7c8)] pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border border-[#2e6b3e] text-[#1c4728] bg-[#eef6f0]">
              Audit Diff · Before &amp; After
            </span>
            <span className="font-mono text-xs text-[var(--color-ink-2,#4a443b)]">
              Compared with baseline from {formatDate(previousDate)}
            </span>
          </div>
          <h2 className="font-serif text-lg font-bold text-[var(--color-ink,#1a1815)] mt-1.5">
            Verification Progression Log
          </h2>
        </div>

        {/* Big Delta Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right font-mono">
            <span className="text-[10px] text-[var(--color-ink-2,#4a443b)] uppercase block">Net Score Delta</span>
            <p className={`text-2xl font-bold ${isPositive ? 'text-[#2e6b3e]' : isNeutral ? 'text-[var(--color-ink-2,#4a443b)]' : 'text-[#c43c29]'}`}>
              {isPositive ? `+${scoreDelta}` : scoreDelta} pts
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 font-mono text-xs">
        <div className="p-3.5 border border-[var(--color-rule,#ded7c8)] bg-white">
          <span className="text-[10px] uppercase text-[var(--color-ink-2,#4a443b)] block">Newly Proven Skills</span>
          <p className="text-xl font-bold text-[#2e6b3e] mt-0.5">
            +{newlyProvenCount}
          </p>
          <span className="text-[10px] text-[var(--color-ink-2,#4a443b)]">Reached verifiable threshold</span>
        </div>

        <div className="p-3.5 border border-[var(--color-rule,#ded7c8)] bg-white">
          <span className="text-[10px] uppercase text-[var(--color-ink-2,#4a443b)] block">Net Proven Delta</span>
          <p className="text-xl font-bold text-[var(--color-ink,#1a1815)] mt-0.5">
            {summaryDelta.proven >= 0 ? `+${summaryDelta.proven}` : summaryDelta.proven}
          </p>
          <span className="text-[10px] text-[var(--color-ink-2,#4a443b)]">Validated skill count change</span>
        </div>

        <div className="p-3.5 border border-[var(--color-rule,#ded7c8)] bg-white">
          <span className="text-[10px] uppercase text-[var(--color-ink-2,#4a443b)] block">Modified Skills</span>
          <p className="text-xl font-bold text-[var(--color-ink,#1a1815)] mt-0.5">
            {improvedSkills.length}
          </p>
          <span className="text-[10px] text-[var(--color-ink-2,#4a443b)]">Skills with updated evidence</span>
        </div>
      </div>

      {/* Newly Proven Highlight Card */}
      {newlyProven.length > 0 && (
        <div className="p-4 border border-[#2e6b3e] bg-[#eef6f0] mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-[#2e6b3e]" />
            <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-[#1c4728]">
              Promoted to Proven ({newlyProven.length})
            </h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {newlyProven.map(item => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-[#2e6b3e] bg-white text-xs font-sans font-semibold text-[#1c4728]"
              >
                <span>{item.name}</span>
                <span className="font-mono text-[10px] text-[#2e6b3e]">+{item.delta} pts</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Improved Skills Table / Audit List */}
      {improvedSkills.length > 0 && (
        <div>
          <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-[var(--color-ink-2,#4a443b)] mb-3">
            Itemized Audit Differential
          </h4>
          <div className="overflow-x-auto border border-[var(--color-rule,#ded7c8)] bg-white">
            <table className="w-full text-left font-sans text-xs">
              <thead>
                <tr className="border-b border-[var(--color-rule,#ded7c8)] bg-[var(--color-paper,#FAF7F0)] font-mono text-[10px] uppercase text-[var(--color-ink-2,#4a443b)]">
                  <th className="py-2.5 px-3">Skill</th>
                  <th className="py-2.5 px-3">Baseline Score</th>
                  <th className="py-2.5 px-3">Current Score</th>
                  <th className="py-2.5 px-3">Score Delta</th>
                  <th className="py-2.5 px-3">Status Progression</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-rule,#ded7c8)]">
                {improvedSkills.map(item => (
                  <tr key={item.id} className="hover:bg-[var(--color-paper,#FAF7F0)]/60 font-mono text-[11px]">
                    <td className="py-2.5 px-3 font-sans font-semibold text-[var(--color-ink,#1a1815)]">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--color-ink-2,#4a443b)]">
                      {item.oldScore}/100
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[var(--color-ink,#1a1815)]">
                      {item.newScore}/100
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`font-bold ${item.delta > 0 ? 'text-[#2e6b3e]' : item.delta < 0 ? 'text-[#c43c29]' : 'text-[var(--color-ink-2,#4a443b)]'}`}>
                        {item.delta > 0 ? `+${item.delta}` : item.delta}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[var(--color-ink-2,#4a443b)]">{item.oldStatus}</span>
                        <span>→</span>
                        <Stamp status={item.newStatus} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
