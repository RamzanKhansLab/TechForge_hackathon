import React from 'react';

export function Rule({ className = '', vertical = false }) {
  if (vertical) {
    return <div className={`w-[1px] bg-rule self-stretch ${className}`} role="separator" aria-orientation="vertical" />;
  }
  return <hr className={`border-0 h-[1px] bg-rule w-full my-4 ${className}`} role="separator" />;
}

export function Leader({ left, right, className = '' }) {
  return (
    <div className={`flex items-baseline w-full ${className}`}>
      <span className="shrink-0">{left}</span>
      <span className="grow mx-2 border-b border-dotted border-ink-3/40" />
      <span className="shrink-0 font-mono tabular-nums">{right}</span>
    </div>
  );
}

export function SectionHeading({ number = '01', title, className = '', action = null }) {
  return (
    <div className={`mb-5 ${className}`}>
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="font-display text-xl font-bold tracking-tight text-ink flex items-baseline gap-3">
          <span className="font-mono text-xs font-semibold text-ink-3 tracking-widest">{number}</span>
          <span>{title}</span>
        </h2>
        {action}
      </div>
      <Rule className="my-0" />
    </div>
  );
}

export function Metric({ label, value, note, stamp = null, className = '' }) {
  return (
    <div className={`border border-rule bg-card p-5 rounded-[2px] ${className}`}>
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wider text-ink-3">{label}</p>
        {stamp}
      </div>
      <p className="my-2 font-display text-3xl font-semibold tracking-tight text-ink tabular-nums">
        {value}
      </p>
      {note && <p className="text-xs text-ink-2 leading-relaxed">{note}</p>}
    </div>
  );
}

export function FlagNote({ code, severity = 'medium', explanation, repo, className = '' }) {
  const edgeColor = severity === 'high' ? 'var(--color-claimed)' : severity === 'medium' ? 'var(--color-partial)' : 'var(--color-ink-3)';
  const badgeBg = severity === 'high' ? 'var(--color-claimed-bg)' : severity === 'medium' ? 'var(--color-partial-bg)' : 'var(--color-paper-2)';

  return (
    <div
      className={`border-l-[3px] bg-card border border-rule p-3 rounded-[2px] text-xs ${className}`}
      style={{ borderLeftColor: edgeColor }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[2px]"
          style={{ backgroundColor: badgeBg, color: edgeColor }}
        >
          {code}
        </span>
        <span className="font-mono text-[10px] text-ink-3 uppercase">{severity} risk</span>
      </div>
      <p className="text-ink-2 leading-relaxed">{explanation}</p>
      {repo && (
        <a
          href={`https://github.com/${repo}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] text-link underline"
        >
          {repo} ↗
        </a>
      )}
    </div>
  );
}

export function KeyBox({ keyValue, type = 'ANALYSIS KEY', onCopy, onDownload, className = '' }) {
  return (
    <div className={`border border-rule bg-paper-2 p-3 rounded-[2px] font-mono ${className}`}>
      <div className="flex items-center justify-between text-[10px] text-ink-3 uppercase tracking-wider mb-1">
        <span>{type}</span>
        <span>AUDIT SECURE</span>
      </div>
      <div className="bg-card border border-rule px-2.5 py-2 text-xs text-ink select-all break-all tracking-tight tabular-nums">
        {keyValue}
      </div>
      <div className="mt-2 flex items-center justify-end gap-2 text-xs">
        {onCopy && (
          <button
            onClick={onCopy}
            className="px-2.5 py-1 border border-rule bg-card hover:bg-paper text-ink rounded-[2px] font-sans text-xs transition"
          >
            Copy key
          </button>
        )}
        {onDownload && (
          <button
            onClick={onDownload}
            className="px-2.5 py-1 border border-rule bg-card hover:bg-paper text-ink rounded-[2px] font-sans text-xs transition"
          >
            Download .txt
          </button>
        )}
      </div>
    </div>
  );
}
