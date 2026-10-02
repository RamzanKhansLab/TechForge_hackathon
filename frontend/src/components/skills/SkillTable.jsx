import { Link } from 'react-router-dom';
import { ArrowUpRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Stamp } from '../../ui/index.js';
import './SkillTable.css';

export default function SkillTable({ skills, analysisId, compact = false }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');

  const filtered = useMemo(() => skills.filter(skill =>
    `${skill.name} ${skill.category}`.toLowerCase().includes(query.toLowerCase()) &&
    (status === 'All' || skill.status === status)
  ), [skills, query, status]);

  return (
    <div className="panel overflow-hidden border border-[var(--color-rule,#ded7c8)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-rule,#ded7c8)] px-5 py-5 sm:px-6">
        <div>
          <h2 className="font-serif text-base font-bold text-[var(--color-ink,#1a1815)]">
            {compact ? 'Skill verification ledger' : 'Skill verification ledger'}
          </h2>
          <p className="mt-1 text-xs text-[var(--color-ink-2,#4a443b)] font-sans">
            Detailed verification breakdown calibrated using Scoring V2 formula.
          </p>
        </div>
        {compact ? (
          <Link to={`/analysis/${analysisId}/skills`} className="flex items-center gap-1 text-xs font-semibold text-[var(--color-ink,#1a1815)] hover:underline">
            All skills <ArrowUpRight size={14} />
          </Link>
        ) : (
          <span className="font-mono text-xs text-[var(--color-ink-2,#4a443b)] border border-[var(--color-rule,#ded7c8)] px-2.5 py-1 bg-[var(--color-paper,#FAF7F0)]">
            {skills.length} skills listed
          </span>
        )}
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-3 border-b border-[var(--color-rule,#ded7c8)] p-5 bg-[var(--color-paper,#FAF7F0)]">
          <div className="relative min-w-44 flex-1">
            <Search size={16} className="absolute left-3 top-3 text-[var(--color-ink-2,#4a443b)]" />
            <input
              className="input pl-9 font-sans text-xs bg-white border-[var(--color-rule,#ded7c8)]"
              aria-label="Search skills"
              placeholder="Search skills, category, or stack…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <select
            className="input w-auto font-mono text-xs bg-white border-[var(--color-rule,#ded7c8)]"
            aria-label="Filter by status"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            {['All', 'Proven', 'Partial', 'Claimed-only'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="skill-table w-full text-left">
          <thead>
            <tr className="border-b border-[var(--color-rule,#ded7c8)] bg-[var(--color-paper,#FAF7F0)] text-[11px] font-mono uppercase tracking-wider text-[var(--color-ink-2,#4a443b)]">
              <th className="py-3 px-4">Skill</th>
              <th className="py-3 px-4">Ledger Status</th>
              <th className="py-3 px-4">Evidence Score</th>
              <th className="py-3 px-4">Signals</th>
              <th className="py-3 px-4"><span className="sr-only">Details</span></th>
            </tr>
          </thead>
          <tbody>
            {(compact ? filtered.slice(0, 6) : filtered).map(skill => (
              <tr key={skill.id} className="border-b border-[var(--color-rule,#ded7c8)] hover:bg-[var(--color-paper,#FAF7F0)]/60 transition-colors">
                <td className="py-3.5 px-4">
                  <Link className="font-semibold text-sm hover:underline text-[var(--color-ink,#1a1815)] font-sans" to={`/analysis/${analysisId}/skills/${skill.id}`}>
                    {skill.name}
                  </Link>
                  <span className="mt-0.5 block font-mono text-[10px] text-[var(--color-ink-2,#4a443b)]">
                    {skill.claimed ? skill.category : `${skill.category} · Discovered via GitHub`}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <Stamp status={skill.status} />
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 font-mono text-xs font-semibold tabular-nums text-[var(--color-ink,#1a1815)]">
                      {skill.score}/100
                    </span>
                    <div className="h-1.5 w-24 bg-[var(--color-rule,#ded7c8)] relative overflow-hidden">
                      <div
                        className={`h-full ${skill.status === 'Proven' ? 'bg-[#2e6b3e]' : skill.status === 'Partial' ? 'bg-[#c97a1e]' : 'bg-[var(--color-ink-2,#4a443b)]'}`}
                        style={{ width: `${Math.min(100, skill.score)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono text-xs text-[var(--color-ink-2,#4a443b)]">
                  {skill.evidence?.length || 0} {(skill.evidence?.length === 1 ? 'signal' : 'signals')}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <Link
                    className="inline-flex items-center justify-center size-7 border border-[var(--color-rule,#ded7c8)] text-[var(--color-ink-2,#4a443b)] hover:bg-[var(--color-paper,#FAF7F0)] hover:text-[var(--color-ink,#1a1815)]"
                    aria-label={`View ${skill.name} evidence`}
                    to={`/analysis/${analysisId}/skills/${skill.id}`}
                  >
                    <ArrowUpRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!filtered.length && (
        <p className="px-6 py-12 text-center text-xs font-mono text-[var(--color-ink-2,#4a443b)]">
          {skills.length ? 'No skills match the active filter criteria.' : 'No skills or public signals were identified.'}
        </p>
      )}
    </div>
  );
}
