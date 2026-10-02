import React, { useState } from 'react';
import {
  Stamp,
  Rule,
  Leader,
  SectionHeading,
  Metric,
  FlagNote,
  KeyBox,
  Drawer,
  EvidenceLink,
  Button
} from '../../ui/index.js';

export default function UiKitShowcase() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="max-w-5xl mx-auto p-6 sm:p-10 space-y-12">
      {/* Header */}
      <div>
        <span className="font-mono text-xs uppercase tracking-widest text-ink-3">DESIGN SYSTEM AUDIT</span>
        <h1 className="font-display text-4xl font-bold tracking-tight text-ink mt-1">Audit Ledger UI Kit</h1>
        <p className="text-ink-2 text-sm mt-2 max-w-2xl leading-relaxed">
          The notarized case file aesthetic for SkillProof. 1px hairline rules, Fraunces editorial titles, IBM Plex Mono tabular data, and SVG-textured verdict stamps.
        </p>
      </div>

      {/* 01 Stamps */}
      <section>
        <SectionHeading number="01" title="Verdict Stamps" />
        <div className="space-y-6">
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-ink-3 mb-3">Large Stamps (Slide-over Drawer & Seals, -2° Rotated)</h4>
            <div className="flex flex-wrap items-center gap-6 p-6 border border-rule bg-paper-2 rounded-[2px]">
              <Stamp verdict="Proven" size="lg" />
              <Stamp verdict="Partial" size="lg" />
              <Stamp verdict="Claimed-only" size="lg" />
            </div>
          </div>
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-ink-3 mb-3">Small Stamps (Tables & Inline Rows)</h4>
            <div className="flex flex-wrap items-center gap-4 p-4 border border-rule bg-card rounded-[2px]">
              <Stamp verdict="Proven" size="sm" />
              <Stamp verdict="Partial" size="sm" />
              <Stamp verdict="Claimed-only" size="sm" />
            </div>
          </div>
        </div>
      </section>

      {/* 02 Metrics */}
      <section>
        <SectionHeading number="02" title="Metrics & Evidence Totals" />
        <div className="grid sm:grid-cols-3 gap-4">
          <Metric label="Proven Skills" value="7" note="Meaningful public code signals meet verification thresholds." stamp={<Stamp verdict="Proven" size="sm" />} />
          <Metric label="Partial Evidence" value="4" note="Repository signals found; room to demonstrate greater depth." stamp={<Stamp verdict="Partial" size="sm" />} />
          <Metric label="Claimed Only" value="2" note="Mentioned on resume, but no public code evidence exists." stamp={<Stamp verdict="Claimed-only" size="sm" />} />
        </div>
      </section>

      {/* 03 Dotted Leaders */}
      <section>
        <SectionHeading number="03" title="Ledger Dotted Leaders" />
        <div className="border border-rule bg-card p-6 rounded-[2px] max-w-lg space-y-3 font-mono text-xs">
          <Leader left="Python (FastAPI, PyTorch)" right="88 / 100" />
          <Leader left="TypeScript (React, Next.js)" right="84 / 100" />
          <Leader left="PostgreSQL (Schema, Migrations)" right="76 / 100" />
          <Leader left="Docker (Containerization)" right="45 / 100" />
          <Leader left="Kubernetes (Orchestration)" right="12 / 100" />
        </div>
      </section>

      {/* 04 Trust Flags */}
      <section>
        <SectionHeading number="04" title="Anti-Gaming Trust Signal Notes" />
        <div className="grid sm:grid-cols-2 gap-4">
          <FlagNote
            code="TEMPLATE_OR_TUTORIAL"
            severity="medium"
            explanation="Repository matches common tutorial template structure; evidence weight reduced by 50%."
            repo="octocat/react-todo-app"
          />
          <FlagNote
            code="SINGLE_COMMIT_DUMP"
            severity="high"
            explanation="Entire repository content was pushed in a single commit dump; weight reduced by 80%."
            repo="octocat/monolith-archive"
          />
          <FlagNote
            code="VENDORED_CODE"
            severity="medium"
            explanation="Committed node_modules or dist bundles detected in repository tree."
            repo="octocat/portfolio-web"
          />
          <FlagNote
            code="TINY_REPO"
            severity="low"
            explanation="Repository contains fewer than 3 source files."
            repo="octocat/quick-snippet"
          />
        </div>
      </section>

      {/* 05 Buttons & KeyBox */}
      <section>
        <SectionHeading number="05" title="Case File Actions & Keys" />
        <div className="grid sm:grid-cols-[1.5fr_1fr] gap-6 items-start">
          <div className="space-y-4">
            <h4 className="font-mono text-xs uppercase tracking-wider text-ink-3">Audit Button Variants</h4>
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary Ledger Action</Button>
              <Button variant="secondary">Hairline Secondary</Button>
              <Button variant="destructive">Destructive Action</Button>
              <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Open Skill Drawer</Button>
            </div>
            <div className="mt-4 p-4 border border-rule bg-paper-2 rounded-[2px] space-y-2">
              <h5 className="font-mono text-xs uppercase tracking-wider text-ink-3">Evidence Links</h5>
              <EvidenceLink
                path="backend/src/server.js"
                line="42"
                href="https://github.com/torvalds/linux/blob/master/Makefile"
                note="Express server initialization with middleware"
              />
              <EvidenceLink
                path="package.json"
                line="15"
                href="https://github.com/torvalds/linux/blob/master/Makefile"
                note="Declared ^4.18.2 in production dependencies"
              />
            </div>
          </div>
          <div>
            <h4 className="font-mono text-xs uppercase tracking-wider text-ink-3 mb-2">Bearer Report Key</h4>
            <KeyBox
              keyValue="c9f87b1e42a98f12d5e6789123456789abcdef0123456789abcdef0123456789"
              type="CASE NO. 2026-SP-0042"
              onCopy={() => alert('Access token copied to clipboard.')}
              onDownload={() => alert('Downloading access key text file.')}
            />
          </div>
        </div>
      </section>

      {/* Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="React"
        subtitle="Frontend Framework · Proven Verdict"
      >
        <div className="flex items-center justify-between border-b border-rule pb-4">
          <Stamp verdict="Proven" size="lg" />
          <div className="text-right">
            <p className="font-mono text-xs text-ink-3">CALCULATED SCORE</p>
            <p className="font-display text-3xl font-bold text-ink tabular-nums">84 / 100</p>
          </div>
        </div>

        <div>
          <h4 className="font-mono text-xs uppercase tracking-wider text-ink-3 mb-2">Evidence Snippets</h4>
          <div className="space-y-3">
            <EvidenceLink
              path="frontend/package.json"
              line="18"
              href="#"
              note="react ^18.2.0 in production dependencies"
            />
            <EvidenceLink
              path="frontend/src/App.jsx"
              line="1"
              href="#"
              note="import React, { useState } from 'react'"
            />
          </div>
        </div>

        <div>
          <h4 className="font-mono text-xs uppercase tracking-wider text-ink-3 mb-2">Trust Flags</h4>
          <FlagNote
            code="TEMPLATE_OR_TUTORIAL"
            severity="medium"
            explanation="Tutorial naming pattern matched; weight adjusted."
            repo="user/react-sandbox"
          />
        </div>

        <Button variant="secondary" className="w-full mt-4" onClick={() => setDrawerOpen(false)}>
          Close Case File
        </Button>
      </Drawer>
    </div>
  );
}
