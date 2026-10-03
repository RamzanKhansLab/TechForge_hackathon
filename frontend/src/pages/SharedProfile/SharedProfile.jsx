import { useParams, Link } from 'react-router-dom';
import { useResource } from '../../hooks/useResource.js';
import { publicApi } from '../../services/api/publicApi.js';
import { Loading, ErrorNotice, PageHeading, Note, ExternalLink } from '../../components/common/UI.jsx';
import { Stamp, Rule, SectionHeading } from '../../ui/index.js';
import DumbbellChart from '../../components/dashboard/DumbbellChart.jsx';
import DiscrepancyReport from '../../components/dashboard/DiscrepancyReport.jsx';
import { formatDate } from '../../utils/format.js';
import { ArrowUpRight, Github, CheckCircle2, CircleDashed, MinusCircle, Layers, ShieldCheck } from 'lucide-react';

export default function SharedProfile() {
  const { shareId } = useParams();
  const { data: analysis, loading, error, reload } = useResource(
    `shared:${shareId}`,
    signal => publicApi.getSharedView(shareId, signal)
  );

  if (loading) return <Loading text="Retrieving verified audit ledger…" />;
  if (error) return (
    <div className="max-w-2xl mx-auto p-8 text-center">
      <div className="panel p-8 border border-[var(--color-rule,#ded7c8)] bg-[var(--color-paper,#FAF7F0)]">
        <h2 className="font-serif text-xl font-bold text-[var(--color-ink,#1a1815)]">Report Unavailable</h2>
        <p className="text-xs text-[var(--color-ink-2,#4a443b)] mt-2 font-sans">
          This shared verification ledger has been set to private or does not exist.
        </p>
        <Link to="/" className="btn btn-secondary mt-5 inline-block text-xs font-mono">
          Return to SkillProof
        </Link>
      </div>
    </div>
  );

  const { summary = {}, github = {}, candidate = {}, skills = [], discrepancyReport = [] } = analysis;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Read-Only Verified Banner */}
      <div className="mb-6 p-4 border border-[#2e6b3e] bg-[#eef6f0] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={20} className="text-[#2e6b3e]" />
          <div>
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-[#1c4728]">
              Publicly Verified Candidate Ledger
            </span>
            <p className="text-xs text-[#1c4728] font-sans">
              All metrics below are backed by publicly audited code commits, package manifests, and repository integrity.
            </p>
          </div>
        </div>
        <Link to="/analyze" className="btn text-xs font-mono border border-[#2e6b3e] bg-white text-[#1c4728] hover:bg-[#eef6f0]">
          Audit Your Profile <ArrowUpRight size={13} />
        </Link>
      </div>

      <PageHeading
        eyebrow="Verified Public Dossier"
        title={candidate.name || github.name || github.login}
        description={`Independent code-level verification for @${analysis.githubUsername}.`}
      />

      {/* Candidate Banner */}
      <section className="panel p-6 border border-[var(--color-rule,#ded7c8)] bg-white mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center border border-[var(--color-rule,#ded7c8)] bg-[var(--color-paper,#FAF7F0)] font-serif text-xl font-bold text-[var(--color-ink,#1a1815)]">
              {(candidate.name || github.login).slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif text-[var(--color-ink,#1a1815)]">
                {candidate.name || github.name || github.login}
              </h2>
              <ExternalLink href={github.url} className="mt-1 text-xs text-[#2e6b3e] font-mono flex items-center gap-1">
                <Github size={13} /> @{github.login}
              </ExternalLink>
              <p className="mt-1 text-[11px] font-mono text-[var(--color-ink-2,#4a443b)]">
                Audited {formatDate(analysis.completedAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs border-l border-[var(--color-rule,#ded7c8)] pl-6">
            <div>
              <p className="text-2xl font-bold text-[#2e6b3e]">{summary.proven || 0}</p>
              <p className="text-[10px] text-[var(--color-ink-2,#4a443b)] uppercase">Proven Skills</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--color-ink,#1a1815)]">{summary.repositoriesAnalyzed || 0}</p>
              <p className="text-[10px] text-[var(--color-ink-2,#4a443b)] uppercase">Repos Inspected</p>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Dumbbell Chart */}
      <div className="mb-6">
        <DumbbellChart skills={skills} />
      </div>

      {/* Discrepancy & Trust Report */}
      <DiscrepancyReport report={discrepancyReport} />

      {/* Skills Table */}
      <div className="panel overflow-hidden border border-[var(--color-rule,#ded7c8)] bg-white mb-6">
        <div className="p-5 border-b border-[var(--color-rule,#ded7c8)] bg-[var(--color-paper,#FAF7F0)]">
          <h3 className="font-serif text-base font-bold text-[var(--color-ink,#1a1815)]">
            Verified Skills Ledger ({skills.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            <thead>
              <tr className="border-b border-[var(--color-rule,#ded7c8)] bg-[var(--color-paper,#FAF7F0)] font-mono text-[10px] uppercase text-[var(--color-ink-2,#4a443b)]">
                <th className="py-3 px-4">Skill</th>
                <th className="py-3 px-4">Ledger Status</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4">Signals Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-rule,#ded7c8)]">
              {skills.map(s => (
                <tr key={s.id} className="hover:bg-[var(--color-paper,#FAF7F0)]/60">
                  <td className="py-3 px-4 font-semibold text-[var(--color-ink,#1a1815)]">
                    {s.name}
                    <span className="block font-mono text-[10px] text-[var(--color-ink-2,#4a443b)]">
                      {s.category}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Stamp status={s.status} />
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-[var(--color-ink,#1a1815)]">
                    {s.score}/100
                  </td>
                  <td className="py-3 px-4 font-mono text-[var(--color-ink-2,#4a443b)]">
                    {s.evidence?.length || 0} signals
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Note>
        This public ledger reflects snapshot data calculated deterministically from public GitHub repositories.
      </Note>
    </div>
  );
}
