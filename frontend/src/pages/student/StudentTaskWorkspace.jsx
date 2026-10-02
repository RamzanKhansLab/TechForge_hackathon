import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { coachApi } from '../../services/api/coachApi.js';
import { Loading, ErrorNotice } from '../../components/common/UI.jsx';
import { Button, KeyBox } from '../../ui/index.js';
import { ArrowLeft, CheckCircle2, XCircle, RefreshCw, Clock, ExternalLink } from 'lucide-react';

export default function StudentTaskWorkspace() {
  const { id, taskId } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);
  const [error, setError] = useState(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    async function loadTaskInfo() {
      try {
        setLoading(true);
        setError(null);
        const res = await coachApi.getRoadmap(id, { hoursPerWeek: 10 });
        const roadmapData = res.data || res;
        const found = (roadmapData?.orderedTasks || []).find(t => t.taskId === taskId || t.skillId === taskId);
        setTask(found || { skillId: taskId, label: taskId, estimatedHours: 2, whyNow: 'Target micro-task' });
      } catch (err) {
        setError(err.message || 'Failed to load task details.');
      } finally {
        setLoading(false);
      }
    }
    loadTaskInfo();
  }, [id, taskId]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  const handleRunCheck = async () => {
    if (cooldownSeconds > 0) return;
    try {
      setChecking(true);
      setError(null);
      const res = await coachApi.checkTask(id, taskId);
      setCheckResult(res.data);
      if (res.data?.cooldown) {
        setCooldownSeconds(res.data.cooldown);
      }
    } catch (err) {
      if (err.response?.data?.error?.code === 'TASK_CHECK_COOLDOWN') {
        const remaining = err.response.data.error.remainingSeconds || 120;
        setCooldownSeconds(remaining);
      } else {
        setError(err.message || 'Failed to execute targeted check.');
      }
    } finally {
      setChecking(false);
    }
  };

  if (loading) return <Loading text="Setting up micro-task workspace..." />;

  return (
    <div className="space-y-8 max-w-4xl">
      <Link to={`/student/${id}/tasks`} className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-3 hover:text-ink">
        <ArrowLeft size={14} />
        Back to micro-tasks
      </Link>

      <div className="border border-rule bg-card p-6 rounded-[2px]">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-rule">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">FOCUSED INTERVENTION</span>
            <h1 className="font-serif text-2xl font-bold text-ink mt-1">{task?.label || taskId}</h1>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 bg-paper border border-rule rounded">
            ~{task?.estimatedHours || 2}h estimated
          </span>
        </div>

        <div className="pt-4 space-y-4">
          <p className="text-sm text-ink-2 leading-relaxed">{task?.whyNow}</p>

          {task?.starterHint && (
            <div className="p-3 bg-paper border border-rule rounded font-mono text-xs text-ink-2">
              <span className="text-[10px] text-ink-3 uppercase block mb-1">STARTER SUGGESTION:</span>
              {task.starterHint}
            </div>
          )}

          <div className="pt-4 border-t border-rule flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-ink-3">
              <span>Targeted re-check inspects only repos relevant to this task with GitHub ETag caching.</span>
            </div>

            <Button
              variant="primary"
              onClick={handleRunCheck}
              disabled={checking || cooldownSeconds > 0}
            >
              {checking ? (
                <>
                  <RefreshCw size={14} className="animate-spin mr-1.5" />
                  Running check...
                </>
              ) : cooldownSeconds > 0 ? (
                <>
                  <Clock size={14} className="mr-1.5" />
                  Cooldown ({cooldownSeconds}s)
                </>
              ) : (
                'Run targeted check'
              )}
            </Button>
          </div>
        </div>
      </div>

      {error && <ErrorNotice error={error} />}

      {/* Target Check Evaluation Results */}
      {checkResult && (
        <div className="border border-rule bg-card p-6 rounded-[2px] space-y-6">
          <div className="flex items-center justify-between border-b border-rule pb-4">
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-xs uppercase tracking-widest font-bold text-ink">EVALUATION OUTCOME</h2>
            </div>
            <span className={`font-mono text-xs px-2 py-0.5 rounded font-bold ${
              checkResult.criteriaPassCount === checkResult.criteriaTotal
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}>
              {checkResult.criteriaPassCount} of {checkResult.criteriaTotal} criteria met
            </span>
          </div>

          <div className="space-y-3">
            {checkResult.criteriaResults?.map((c, i) => (
              <div key={i} className="p-3 border border-rule bg-paper rounded flex items-start gap-3">
                {c.passed ? (
                  <CheckCircle2 size={18} className="text-forest mt-0.5 shrink-0" />
                ) : (
                  <XCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                )}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-ink">{c.criterion}</p>
                  <p className="text-[11px] font-mono text-ink-3">{c.lookedFor}</p>
                  {c.evidenceLinks?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {c.evidenceLinks.map((url, uidx) => (
                        <a key={uidx} href={url} target="_blank" rel="noreferrer" className="text-[11px] text-forest hover:underline">
                          Artifact link ↗
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs font-mono text-ink-3">
            <span>Requests used: {checkResult.requestsUsed}</span>
            <span>Next check available in: {cooldownSeconds}s</span>
          </div>
        </div>
      )}
    </div>
  );
}
