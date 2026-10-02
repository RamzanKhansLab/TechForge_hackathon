import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { publicApi } from '../../services/api/publicApi.js';
import { Logo } from '../../components/common/UI.jsx';
import { Stamp, Button, KeyBox } from '../../ui/index.js';
import {
  ArrowRight,
  ArrowUpRight,
  ShieldCheck,
  BriefcaseBusiness,
  Sparkles,
  GitBranch,
  FileText,
  Search,
  CheckCircle2,
  Lock,
  Layers,
  Fingerprint
} from 'lucide-react';
import './Landing.css';

export default function Landing() {
  const [stats, setStats] = useState({ analyses: 142, skillsVerified: 876 });

  useEffect(() => {
    publicApi.getStats()
      .then(res => {
        if (res.data) setStats(res.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="landing min-h-screen bg-paper text-ink font-sans">
      {/* Editorial Header */}
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-6 sm:px-10 border-b border-rule">
        <Link to="/" aria-label="SkillProof home">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold tracking-tight text-ink">SkillProof</span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">AUDIT LEDGER</span>
          </div>
        </Link>
        <nav className="hidden items-center gap-8 text-xs font-mono text-ink-3 md:flex">
          <Link to="/student" className="hover:text-ink">Student Coach</Link>
          <Link to="/recruiter" className="hover:text-ink">Evidence Desk</Link>
          <Link to="/methodology" className="hover:text-ink">Methodology & Ethics</Link>
          <Link to="/ui-kit" className="hover:text-ink">UI Kit</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/analyze">
            <Button variant="primary" className="text-xs">
              <span>New Intake</span>
              <ArrowUpRight size={14} className="ml-1" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12 sm:px-10 space-y-16">
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto space-y-4 pt-4 sm:pt-10">
          <span className="font-mono text-xs uppercase tracking-widest text-ink-3 border border-rule px-3 py-1 rounded-full bg-card inline-block">
            EVIDENCE OVER CLAIMS · NOT A HIRING PREDICTION
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-ink leading-tight">
            One Evidence Engine.<br />
            <span className="text-forest italic">Two Auditing Lenses.</span>
          </h1>
          <p className="text-sm sm:text-base text-ink-2 max-w-2xl mx-auto leading-relaxed">
            SkillProof deterministically audits resumes against public GitHub repositories. No LLM hallucinations, no opaque recruiter rankings, no candidate predictions.
          </p>
          <div className="pt-2 font-mono text-xs text-ink-3">
            <span>Verified to date: </span>
            <strong className="text-ink">{stats.analyses} case files</strong>
            <span> and </span>
            <strong className="text-forest">{stats.skillsVerified} verified skills</strong>.
          </div>
        </section>

        {/* Dual Role Split Entry Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          {/* Lens 1: Student / Coach */}
          <div className="border border-rule bg-card p-8 rounded-[2px] flex flex-col justify-between space-y-8 hover:border-forest/50 transition">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-forest font-bold bg-forest/10 px-2.5 py-1 rounded">
                  FOR STUDENTS & CANDIDATES
                </span>
                <span className="size-8 rounded bg-forest/10 text-forest flex items-center justify-center">
                  <ShieldCheck size={18} />
                </span>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">SkillProof Coach</h2>
              <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
                Substantiate your resume claims with verifiable code evidence. Get a weekly topological execution plan, deterministic redline copy-pastes, and shared gap analysis.
              </p>

              <ul className="space-y-2.5 text-xs font-mono text-ink-2 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-forest shrink-0" />
                  <span>Proof Readiness: Find claimed skills missing public code</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-forest shrink-0" />
                  <span>Topological Roadmap: DAG-ordered weekly packing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-forest shrink-0" />
                  <span>Resume Redlines: 7 deterministic discrepancy rules</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-forest shrink-0" />
                  <span>Target Roles & Multi-Match: Shared gap analysis</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-rule space-y-3">
              <Link to="/student" className="block">
                <Button variant="primary" className="w-full justify-center text-sm py-2.5">
                  <span>Enter Coach Workspace</span>
                  <ArrowRight size={16} className="ml-1.5" />
                </Button>
              </Link>
              <Link to="/analyze" className="block text-center text-xs font-mono text-ink-3 hover:text-ink">
                Or upload a resume to start a fresh audit →
              </Link>
            </div>
          </div>

          {/* Lens 2: Recruiter / Evidence Desk */}
          <div className="border border-rule bg-card p-8 rounded-[2px] flex flex-col justify-between space-y-8 hover:border-ink/50 transition">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3 font-bold bg-paper border border-rule px-2.5 py-1 rounded">
                  FOR RECRUITERS & REVIEWERS
                </span>
                <span className="size-8 rounded bg-paper border border-rule text-ink flex items-center justify-center">
                  <BriefcaseBusiness size={18} />
                </span>
              </div>

              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">Evidence Desk</h2>
              <p className="text-xs sm:text-sm text-ink-2 leading-relaxed">
                Review verified candidate evidence sheets and run stateless requirement matrices. Strictly capability-based: zero logins, zero candidate ranking, zero predictions.
              </p>

              <ul className="space-y-2.5 text-xs font-mono text-ink-2 pt-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-ink shrink-0" />
                  <span>Single Candidate Dossier: Dense evidence ledger</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-ink shrink-0" />
                  <span>Stateless JD Match: Instant coverage breakdown</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-ink shrink-0" />
                  <span>"Verify Yourself": Step-by-step GitHub inspection</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-ink shrink-0" />
                  <span>Requirement Matrix: Side-by-side non-ranked compare</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-rule space-y-3">
              <Link to="/recruiter" className="block">
                <Button variant="secondary" className="w-full justify-center text-sm py-2.5">
                  <span>Open Evidence Desk</span>
                  <ArrowRight size={16} className="ml-1.5" />
                </Button>
              </Link>
              <div className="text-center text-[11px] font-mono text-ink-3">
                Paste a share link or compare tokens with zero signup
              </div>
            </div>
          </div>
        </section>

        {/* 4-Step Ledger Progression */}
        <section className="border border-rule bg-card p-8 rounded-[2px] space-y-6">
          <div className="border-b border-rule pb-4">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">THE VERIFICATION LIFECYCLE</span>
            <h3 className="font-serif text-2xl font-bold text-ink mt-0.5">How SkillProof Works</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <span className="font-mono text-xs font-bold text-forest">01 / INTAKE</span>
              <h4 className="font-bold text-sm text-ink">Extract Claims</h4>
              <p className="text-xs text-ink-3 leading-relaxed">
                Resume PDF is parsed into claimed skills, claimed experience dates, and public GitHub identity.
              </p>
            </div>
            <div className="space-y-2">
              <span className="font-mono text-xs font-bold text-forest">02 / INSPECT</span>
              <h4 className="font-bold text-sm text-ink">Query Repositories</h4>
              <p className="text-xs text-ink-3 leading-relaxed">
                Dependency manifests, Dockerfiles, test suites, and git commit author signatures are fetched via GitHub API.
              </p>
            </div>
            <div className="space-y-2">
              <span className="font-mono text-xs font-bold text-forest">03 / AUDIT</span>
              <h4 className="font-bold text-sm text-ink">Deterministic Scoring</h4>
              <p className="text-xs text-ink-3 leading-relaxed">
                Pure mathematical weights and ontology graph implications classify skills into Proven, Partial, or Claimed-only.
              </p>
            </div>
            <div className="space-y-2">
              <span className="font-mono text-xs font-bold text-forest">04 / SUBSTANTIATE</span>
              <h4 className="font-bold text-sm text-ink">Actionable Proof</h4>
              <p className="text-xs text-ink-3 leading-relaxed">
                Students close gaps through targeted code tasks; reviewers verify artifacts directly on GitHub.
              </p>
            </div>
          </div>
        </section>

        {/* Ethics & Guardrails Callout */}
        <section className="p-6 border border-rule bg-paper rounded-[2px] flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-ink-2">
          <div className="space-y-1">
            <span className="font-bold uppercase text-ink flex items-center gap-1.5">
              <Lock size={14} className="text-forest" />
              ETHICS & ACCESS GUARDRAILS
            </span>
            <p className="text-ink-3">
              Zero candidate rankings · Capability-token access · 100% deterministic rules · Explainable by design
            </p>
          </div>
          <Link to="/methodology">
            <Button variant="secondary" className="text-xs">
              Read Methodology ↗
            </Button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-rule bg-card py-8 px-6 sm:px-10 text-xs font-mono text-ink-3 mt-16">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="font-bold text-ink">SkillProof</span> · Evidence-backed skill verification.
          </div>
          <div className="flex gap-6">
            <Link to="/student" className="hover:text-ink">Coach Lens</Link>
            <Link to="/recruiter" className="hover:text-ink">Evidence Desk</Link>
            <Link to="/methodology" className="hover:text-ink">Methodology</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
