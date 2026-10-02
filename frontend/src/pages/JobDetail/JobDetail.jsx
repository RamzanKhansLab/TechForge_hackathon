import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Target, Briefcase } from 'lucide-react';
import { useResource } from '../../hooks/useResource.js';
import { useReports } from '../../context/ReportContext.jsx';
import { jobApi } from '../../services/api/jobApi.js';
import { ErrorNotice, Loading, PageHeading, Note } from '../../components/common/UI.jsx';
import { ExportKey, ImportKey } from '../../components/common/AccessKey.jsx';
import { Stamp, Rule, SectionHeading } from '../../ui/index.js';
import TaskCard from '../../components/jobs/TaskCard.jsx';
import { skillLabel } from '../../utils/format.js';
import './JobDetail.css';

export default function JobDetail() {
  const { id } = useParams();
  const { reports } = useReports();
  const token = reports.find(r => r.type === 'job' && r.id === id)?.token;
  const { data: job, loading, error, reload, setData } = useResource(`job:${id}:${token}`, signal => jobApi.get(id, signal));

  if (loading) return <Loading />;
  if (error) return <><ErrorNotice error={error} retry={reload} />{error.code === 'ACCESS_DENIED' && <ImportKey id={id} type="job" />}</>;

  return (
    <>
      <Link className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-ink-2,#4a443b)]" to="/jobs">
        <ArrowLeft size={14} /> Back to role matcher
      </Link>
      <PageHeading
        eyebrow="Role Reconciliation Ledger"
        title={job.title || 'Role Requirements Analysis'}
        description={job.analysisId ? 'Verifiable public GitHub evidence mapped directly against required role qualifications.' : 'Required and preferred technical competencies extracted from description.'}
        action={<ExportKey id={id} type="job" />}
      />

      {job.analysisId ? (
        <>
          <div className="mb-7 grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            <section className="panel p-6 border-2 border-[var(--color-rule,#ded7c8)] bg-[var(--color-paper,#FAF7F0)]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-ink-2,#4a443b)]">Verified Match Coverage</span>
                <Target size={20} className="text-[#2e6b3e]" />
              </div>
              <p className="my-4 font-mono text-6xl font-bold tracking-tight text-[var(--color-ink,#1a1815)]">
                {job.coverage === null ? '—' : `${job.coverage}%`}
              </p>
              <p className="text-xs leading-relaxed text-[var(--color-ink-2,#4a443b)] font-sans">
                {job.coverage === null
                  ? 'No required ontology skills matched. Denominator unavailable for score computation.'
                  : 'Full credit awarded for Proven skills. Half credit for Partial evidence. Preferred skills excluded from denominator.'}
              </p>
              <Link to={`/analysis/${job.analysisId}`} className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#2e6b3e] hover:underline font-mono">
                Inspect candidate ledger <ArrowUpRight size={13} />
              </Link>
            </section>

            <div className="grid gap-3">
              {[
                { label: 'Verified matches', count: job.summary.verified, stamp: 'Proven' },
                { label: 'Partial evidence', count: job.summary.partial, stamp: 'Partial' },
                { label: 'Unverified gaps', count: job.summary.gaps, stamp: 'Claimed-only' }
              ].map(item => (
                <div key={item.label} className="panel flex items-center justify-between px-6 py-4 border border-[var(--color-rule,#ded7c8)] bg-white">
                  <div>
                    <p className="mb-1.5 text-xs font-sans text-[var(--color-ink-2,#4a443b)]">{item.label}</p>
                    <Stamp status={item.stamp} />
                  </div>
                  <strong className="font-mono text-3xl font-bold text-[var(--color-ink,#1a1815)]">{item.count}</strong>
                </div>
              ))}
            </div>
          </div>

          <section className="panel mb-7 overflow-hidden border border-[var(--color-rule,#ded7c8)]">
            <div className="px-6 py-5 border-b border-[var(--color-rule,#ded7c8)] bg-[var(--color-paper,#FAF7F0)] flex items-center justify-between">
              <div>
                <h2 className="font-serif text-base font-bold text-[var(--color-ink,#1a1815)]">Requirement Breakdown</h2>
                <p className="mt-0.5 text-xs text-[var(--color-ink-2,#4a443b)] font-mono">{job.summary.required} required qualifications evaluated</p>
              </div>
            </div>
            <div className="divide-y divide-[var(--color-rule,#ded7c8)]">
              {job.matches.map(match => (
                <article className="flex flex-wrap items-start justify-between gap-4 p-5 hover:bg-[var(--color-paper,#FAF7F0)]/40 transition-colors" key={match.skill}>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h3 className="text-sm font-bold font-sans text-[var(--color-ink,#1a1815)]">{match.name}</h3>
                      <Stamp status={match.candidateStatus === 'Proven' ? 'Proven' : match.candidateStatus === 'Partial' ? 'Partial' : 'Claimed-only'} />
                    </div>
                    <p className="text-xs leading-relaxed text-[var(--color-ink-2,#4a443b)] font-sans">{match.reason}</p>
                    <p className="mt-2 text-[10px] font-mono text-[var(--color-ink-2,#4a443b)]">
                      Evidence score: {match.score}/100 · {match.evidence.length} signals
                    </p>
                  </div>
                  {match.candidateStatus !== 'Missing' && (
                    <Link className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-[#2e6b3e] hover:underline" to={`/analysis/${job.analysisId}/skills/${match.skill}`}>
                      Evidence <ArrowUpRight size={13} />
                    </Link>
                  )}
                </article>
              ))}
              {!job.matches.length && (
                <p className="p-6 text-xs font-mono text-[var(--color-ink-2,#4a443b)]">
                  No required skills matched candidate claims.
                </p>
              )}
            </div>
          </section>
        </>
      ) : (
        <div className="mb-7">
          <Note>
            No candidate report selected. <Link to="/jobs" className="underline font-semibold">Select a candidate report to compute alignment.</Link>
          </Note>
        </div>
      )}

      <div className="mb-7 grid gap-5 md:grid-cols-2">
        {[['Required skills', job.requiredSkills], ['Preferred skills', job.preferredSkills]].map(([label, skills]) => (
          <section className="panel p-6 border border-[var(--color-rule,#ded7c8)] bg-white" key={label}>
            <h2 className="mb-3 font-serif text-sm font-bold text-[var(--color-ink,#1a1815)]">{label}</h2>
            <div className="flex flex-wrap gap-2">
              {skills.length ? (
                skills.map(skill => (
                  <span key={skill} className="border border-[var(--color-rule,#ded7c8)] bg-[var(--color-paper,#FAF7F0)] px-2.5 py-1 text-xs font-mono">
                    {skillLabel(skill)}
                  </span>
                ))
              ) : (
                <p className="text-xs font-mono text-[var(--color-ink-2,#4a443b)]">None identified by ontology.</p>
              )}
            </div>
            {label === 'Preferred skills' && (
              <p className="mt-4 text-[10px] font-mono text-[var(--color-ink-2,#4a443b)]">
                Exempt from Skill Coverage denominator.
              </p>
            )}
          </section>
        ))}
      </div>

      {job.microTasks.length > 0 && (
        <section className="mb-7">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-2,#4a443b)] mb-1">
                Verifiable Progression Roadmap
              </p>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-[var(--color-ink,#1a1815)]">
                Build evidence for qualification gaps.
              </h2>
              <p className="text-xs text-[var(--color-ink-2,#4a443b)] mt-1 font-sans">
                Focused technical micro-tasks designed to produce verifiable repository code and commits.
              </p>
            </div>
            <span className="font-mono text-xs text-[var(--color-ink-2,#4a443b)] border border-[var(--color-rule,#ded7c8)] px-3 py-1 bg-white">
              {job.microTasks.filter(t => t.status === 'done').length} / {job.microTasks.length} self-completed
            </span>
          </div>
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {job.microTasks.map(task => (
              <TaskCard key={task.skill} task={task} jobId={id} onUpdate={setData} />
            ))}
          </div>
        </section>
      )}

      {job.analysisId && job.microTasks.length === 0 && job.requiredSkills.length > 0 && (
        <div className="panel mb-7 border border-[#2e6b3e] bg-[#eef6f0] p-6">
          <h2 className="font-serif font-bold text-[#1c4728]">All required qualifications verified.</h2>
          <p className="text-xs text-[#1c4728] mt-1 font-sans">
            Public evidence satisfies every required skill specification identified in this description.
          </p>
        </div>
      )}

      <details className="panel mb-6 p-6 border border-[var(--color-rule,#ded7c8)] bg-white">
        <summary className="cursor-pointer font-serif text-sm font-semibold text-[var(--color-ink,#1a1815)]">
          Inspect original role text
        </summary>
        <p className="mt-4 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-[var(--color-ink-2,#4a443b)]">
          {job.jobDescription}
        </p>
      </details>

      <Note>
        {job.warnings.map((warning, i) => (
          <p key={i}>{warning}</p>
        ))}
        <p>Coverage is an objective evidence metric; it does not replace subjective interview evaluation.</p>
      </Note>
    </>
  );
}

