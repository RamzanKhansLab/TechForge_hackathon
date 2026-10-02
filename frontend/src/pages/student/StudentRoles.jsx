import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { coachApi } from '../../services/api/coachApi.js';
import { Loading, ErrorNotice } from '../../components/common/UI.jsx';
import { Button } from '../../ui/index.js';
import { Target, Layers, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function StudentRoles() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadRoles() {
      try {
        setLoading(true);
        setError(null);
        const res = await coachApi.getRoleCompare(id);
        setData(res.data || res);
      } catch (err) {
        setError(err.message || 'Failed to load role comparison.');
      } finally {
        setLoading(false);
      }
    }
    loadRoles();
  }, [id]);

  if (loading) return <Loading text="Aggregating target role comparisons & shared gaps..." />;
  if (error) return <ErrorNotice error={error} retry={() => window.location.reload()} />;

  const { roles = [], sharedGaps = [] } = data || {};

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">ALIGNMENT ACROSS SAVED JDS</span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">Target Roles & Multi-Match</h1>
          <p className="text-xs text-ink-3 mt-1 max-w-xl">
            Compare evidence coverage across your target roles and find shared gaps where one project closes multiple requirements.
          </p>
        </div>
        <Link to="/jobs">
          <Button variant="secondary" className="text-xs">
            Analyze another JD
          </Button>
        </Link>
      </div>

      {roles.length === 0 ? (
        <div className="p-8 text-center border border-rule bg-card rounded">
          <Target size={32} className="mx-auto text-ink-3 mb-2" />
          <p className="font-bold text-base text-ink">No target roles saved yet</p>
          <p className="text-xs text-ink-3 mt-1 mb-4">Paste job descriptions in Job Matching and tag them as target roles to see shared gaps.</p>
          <Link to="/jobs">
            <Button variant="primary">Go to Job Matching</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Shared Gaps Section */}
          {sharedGaps.length > 0 && (
            <div className="p-6 border border-rule bg-paper rounded-[2px] space-y-4">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-forest" />
                <h2 className="font-mono text-xs uppercase tracking-widest font-bold text-ink">HIGH-LEVERAGE SHARED GAPS</h2>
              </div>
              <p className="text-xs text-ink-3">
                Skills missing in 2 or more of your target roles. Completing one micro-task helps multiple applications.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sharedGaps.map(g => (
                  <div key={g.skillId} className="p-3 border border-rule bg-card rounded flex items-center justify-between">
                    <div>
                      <span className="font-sans font-bold text-sm text-ink">{g.label}</span>
                      <p className="text-[11px] font-mono text-ink-3 mt-0.5">Required by {g.missingInRoles} saved roles</p>
                    </div>
                    <Link to={`/student/${id}/tasks/${g.taskId}`}>
                      <Button variant="secondary" className="text-xs py-1">
                        Task →
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-Role Breakdown Grid */}
          <div className="space-y-4">
            <h2 className="font-mono text-xs uppercase tracking-widest font-bold text-ink">SAVED TARGET ROLES</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {roles.map(role => (
                <div key={role.jobId} className="p-5 border border-rule bg-card rounded flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-rule">
                      <span className="font-sans font-bold text-base text-ink">{role.roleTitle}</span>
                      <span className="font-mono text-xs font-bold text-forest bg-forest/10 px-2 py-0.5 rounded">
                        {role.coverage}% match
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-3 text-center font-mono text-xs border-b border-rule">
                      <div>
                        <span className="text-[10px] text-ink-3 block">VERIFIED</span>
                        <span className="font-bold text-forest">{role.verified}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-3 block">PARTIAL</span>
                        <span className="font-bold text-amber-700">{role.partial}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-3 block">GAPS</span>
                        <span className="font-bold text-ink-3">{role.gaps}</span>
                      </div>
                    </div>

                    {role.topGaps?.length > 0 && (
                      <div className="pt-3">
                        <span className="text-[10px] font-mono uppercase text-ink-3 block mb-1">TOP GAPS TO CLOSE:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {role.topGaps.map(g => (
                            <span key={g} className="px-2 py-0.5 bg-paper border border-rule text-xs font-mono text-ink-2 rounded">
                              {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-rule flex items-center justify-between">
                    <Link to={`/jobs/${role.jobId}`} className="text-xs font-mono text-forest hover:underline">
                      View full JD breakdown ↗
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
