import { ShieldAlert, AlertTriangle, Info, Sparkles, ExternalLink } from 'lucide-react';
import { Rule, SectionHeading } from '../../ui/index.js';

const severityConfig = {
  high: {
    label: 'High Severity',
    className: 'border-[#c43c29] bg-[#fbf2f0] text-[#8f2718]',
    badgeClass: 'border-[#c43c29] text-[#8f2718]',
    icon: ShieldAlert
  },
  medium: {
    label: 'Medium Warning',
    className: 'border-[#c97a1e] bg-[#fdf8f0] text-[#8c500e]',
    badgeClass: 'border-[#c97a1e] text-[#8c500e]',
    icon: AlertTriangle
  },
  low: {
    label: 'Notice',
    className: 'border-[var(--color-rule,#ded7c8)] bg-[var(--color-paper,#FAF7F0)] text-[var(--color-ink-2,#4a443b)]',
    badgeClass: 'border-[var(--color-rule,#ded7c8)] text-[var(--color-ink-2,#4a443b)]',
    icon: Info
  },
  positive: {
    label: 'Hidden Strength',
    className: 'border-[#2e6b3e] bg-[#eef6f0] text-[#1c4728]',
    badgeClass: 'border-[#2e6b3e] text-[#1c4728]',
    icon: Sparkles
  }
};

export default function DiscrepancyReport({ report = [] }) {
  if (!report || report.length === 0) {
    return (
      <div className="panel p-6 border border-[var(--color-rule,#ded7c8)] bg-[var(--color-paper,#FAF7F0)]">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-[#eef6f0] text-[#2e6b3e] border border-[#2e6b3e]/30">
            ✓
          </span>
          <div>
            <h3 className="font-serif text-sm font-semibold text-[var(--color-ink,#1a1815)]">Clean Ledger Verification</h3>
            <p className="text-xs text-[var(--color-ink-2,#4a443b)] mt-0.5">
              No significant timeline, artifact, or volume discrepancies identified between resume claims and public GitHub evidence.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Count severities
  const counts = report.reduce((acc, item) => {
    acc[item.severity] = (acc[item.severity] || 0) + 1;
    return acc;
  }, {});

  return (
    <section className="panel p-6 border border-[var(--color-rule,#ded7c8)] bg-[var(--color-canvas,#F5F1E8)] mb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <div>
          <SectionHeading level={2}>Audit Ledger: Discrepancy &amp; Trust Report</SectionHeading>
          <p className="text-xs text-[var(--color-ink-2,#4a443b)] mt-1 font-sans">
            Independent reconciliation comparing claims against verifiable commit history, package manifests, and repository integrity.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          {counts.high > 0 && (
            <span className="px-2 py-0.5 border border-[#c43c29] text-[#8f2718] bg-[#fbf2f0] font-semibold">
              {counts.high} High
            </span>
          )}
          {counts.medium > 0 && (
            <span className="px-2 py-0.5 border-[#c97a1e] text-[#8c500e] bg-[#fdf8f0] font-semibold border">
              {counts.medium} Warning
            </span>
          )}
          {counts.positive > 0 && (
            <span className="px-2 py-0.5 border-[#2e6b3e] text-[#1c4728] bg-[#eef6f0] font-semibold border">
              +{counts.positive} Discovered
            </span>
          )}
          {counts.low > 0 && (
            <span className="px-2 py-0.5 border-[var(--color-rule,#ded7c8)] text-[var(--color-ink-2,#4a443b)] bg-[var(--color-paper,#FAF7F0)] border">
              {counts.low} Notice
            </span>
          )}
        </div>
      </div>

      <Rule />

      <div className="mt-4 space-y-3">
        {report.map((item, idx) => {
          const cfg = severityConfig[item.severity] || severityConfig.low;
          const Icon = cfg.icon;

          return (
            <div
              key={`${item.type}-${item.skillId || 'gen'}-${idx}`}
              className={`p-3.5 border text-xs ${cfg.className} transition-all`}
            >
              <div className="flex items-start gap-3">
                <Icon size={16} className="shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 border bg-white/70">
                      {item.type}
                    </span>
                    {item.skillId && (
                      <span className="font-mono text-[11px] font-semibold text-[var(--color-ink,#1a1815)]">
                        Target: {item.skillId}
                      </span>
                    )}
                  </div>
                  <p className="leading-relaxed font-sans text-xs">
                    {item.message}
                  </p>
                  {item.evidenceLinks && item.evidenceLinks.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono">
                      <span className="text-[var(--color-ink-2,#4a443b)]">Evidence references:</span>
                      {item.evidenceLinks.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-[var(--color-ink,#1a1815)]"
                        >
                          {link.replace(/^https?:\/\/github\.com\//, '')}
                          <ExternalLink size={10} />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
