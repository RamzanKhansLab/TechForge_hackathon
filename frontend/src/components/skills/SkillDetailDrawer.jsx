import React from 'react';
import { Drawer, EvidenceLink, Button } from '../../ui/index.js';
import { Stamp } from '../../ui/index.js';
import { ExternalLink, GitCommit, Calendar, Layers, CheckCircle2, ShieldCheck } from 'lucide-react';
import { formatDate } from '../../utils/format.js';

/**
 * SkillDetailDrawer
 * Slide-over drawer displaying comprehensive breakdown, verified activity timeline,
 * code evidence links, and repository origins for a selected skill.
 */
export default function SkillDetailDrawer({ skill, analysis, isOpen, onClose }) {
  if (!skill) return null;

  const repositories = (analysis?.repositories || []).filter(repo =>
    (skill.repositories || []).includes(repo.name)
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={skill.name}
      subtitle={`${skill.category} · ${skill.claimed ? 'Claimed on resume' : 'Discovered via GitHub'}`}
    >
      <div className="space-y-6">
        {/* Top Header: Score & Stamp */}
        <div className="p-4 border border-[var(--color-rule,#ded7c8)] bg-[var(--color-paper,#FAF7F0)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase text-[var(--color-ink-2,#4a443b)] tracking-wider">
              Verification Status
            </span>
            <div className="mt-1">
              <Stamp status={skill.status} />
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-[var(--color-ink-2,#4a443b)] tracking-wider">
              Evidence Score
            </span>
            <p className="font-mono text-2xl font-bold text-[var(--color-ink,#1a1815)]">
              {skill.score}<span className="text-sm font-normal text-[var(--color-ink-2,#4a443b)]">/100</span>
            </p>
          </div>
        </div>

        {/* Claimed vs Verified Timeline info */}
        {(skill.claimedYears !== undefined || skill.verifiedYears !== undefined) && (
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 border border-[var(--color-rule,#ded7c8)] bg-white">
              <span className="text-[10px] text-[var(--color-ink-2,#4a443b)] uppercase block">Resume Stated</span>
              <p className="font-bold text-sm text-[var(--color-ink,#1a1815)] mt-0.5">
                {skill.claimedYears ? `${skill.claimedYears} Years` : 'Unspecified'}
              </p>
              {skill.claimedSince && (
                <span className="text-[10px] text-[var(--color-ink-2,#4a443b)]">Since {skill.claimedSince}</span>
              )}
            </div>
            <div className="p-3 border border-[var(--color-rule,#ded7c8)] bg-white">
              <span className="text-[10px] text-[var(--color-ink-2,#4a443b)] uppercase block">GitHub Verified</span>
              <p className="font-bold text-sm text-[#2e6b3e] mt-0.5">
                {skill.verifiedYears ? `${skill.verifiedYears} Years` : '0 Years'}
              </p>
              {skill.verifiedSince && (
                <span className="text-[10px] text-[var(--color-ink-2,#4a443b)]">First commit {skill.verifiedSince}</span>
              )}
            </div>
          </div>
        )}

        {/* Reason / Verdict notes */}
        {skill.reasons && skill.reasons.length > 0 && (
          <div>
            <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-[var(--color-ink-2,#4a443b)] mb-2">
              Auditor Findings
            </h4>
            <ul className="space-y-1.5 text-xs text-[var(--color-ink,#1a1815)]">
              {skill.reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#2e6b3e] font-mono mt-0.5">›</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Scoring V2 Breakdown */}
        <div>
          <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-[var(--color-ink-2,#4a443b)] mb-2">
            Scoring Formula Breakdown
          </h4>
          <div className="border border-[var(--color-rule,#ded7c8)] bg-white divide-y divide-[var(--color-rule,#ded7c8)] text-xs">
            {skill.breakdown && skill.breakdown.length > 0 ? (
              skill.breakdown.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-[var(--color-ink,#1a1815)] font-sans">{item.rule}</p>
                    <p className="text-[10px] text-[var(--color-ink-2,#4a443b)] font-mono mt-0.5">
                      {item.evidenceId ? `Ref: ${item.evidenceId}` : 'Algorithmic signal evaluation'}
                    </p>
                  </div>
                  <span className="font-mono font-semibold text-[#2e6b3e] shrink-0">
                    +{item.points} pts
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-xs font-mono text-[var(--color-ink-2,#4a443b)]">
                No scoring points logged for this entry.
              </div>
            )}
          </div>
        </div>

        {/* Evidence Artifacts */}
        <div>
          <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-[var(--color-ink-2,#4a443b)] mb-2">
            Verifiable Evidence Artifacts ({skill.evidence?.length || 0})
          </h4>
          <div className="space-y-2">
            {skill.evidence && skill.evidence.length > 0 ? (
              skill.evidence.map((ev, idx) => (
                <div
                  key={`${ev.repository}-${ev.file || 'f'}-${idx}`}
                  className="p-3 border border-[var(--color-rule,#ded7c8)] bg-white text-xs font-sans"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-1 border bg-[var(--color-paper,#FAF7F0)] text-[var(--color-ink-2,#4a443b)]">
                      {ev.type}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--color-ink-2,#4a443b)]">
                      {ev.date ? formatDate(ev.date) : ''}
                    </span>
                  </div>
                  <p className="text-[var(--color-ink,#1a1815)] leading-relaxed mt-1">
                    {ev.description}
                  </p>
                  {ev.url && (
                    <div className="mt-2">
                      <EvidenceLink
                        href={ev.url}
                        path={`${ev.repository}${ev.file ? ` / ${ev.file}` : ''}`}
                        line={ev.line}
                      />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="p-4 border border-[var(--color-rule,#ded7c8)] bg-white text-xs font-mono text-[var(--color-ink-2,#4a443b)]">
                No code or manifest artifacts currently detected.
              </p>
            )}
          </div>
        </div>

        {/* Linked Repositories */}
        {repositories.length > 0 && (
          <div>
            <h4 className="font-serif text-xs font-bold uppercase tracking-wider text-[var(--color-ink-2,#4a443b)] mb-2">
              Attributed Repositories
            </h4>
            <div className="space-y-2">
              {repositories.map(repo => (
                <div key={repo.fullName} className="p-3 border border-[var(--color-rule,#ded7c8)] bg-white text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold text-[var(--color-ink,#1a1815)]">
                      {repo.name}
                    </span>
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-[11px] underline text-[#2e6b3e] inline-flex items-center gap-1"
                    >
                      View on GitHub <ExternalLink size={10} />
                    </a>
                  </div>
                  {repo.description && (
                    <p className="text-[var(--color-ink-2,#4a443b)] mt-1">{repo.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
