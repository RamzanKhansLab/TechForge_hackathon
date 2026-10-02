import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { coachApi } from '../../services/api/coachApi.js';
import { analysisApi } from '../../services/api/analysisApi.js';
import { Loading, ErrorNotice } from '../../components/common/UI.jsx';
import { Button } from '../../ui/index.js';
import { CheckCircle2, Circle, Clock, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';

export default function StudentTasks() {
  const { id } = useParams();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadTasks() {
      try {
        setLoading(true);
        setError(null);
        // Get roadmap to get all microtasks structured
        const res = await coachApi.getRoadmap(id, { hoursPerWeek: 10 });
        const roadmapData = res.data || res;
        setTasks(roadmapData?.orderedTasks || []);
      } catch (err) {
        setError(err.message || 'Failed to load micro-tasks.');
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, [id]);

  if (loading) return <Loading text="Loading micro-tasks from evidence engine..." />;
  if (error) return <ErrorNotice error={error} retry={() => window.location.reload()} />;

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">COACH ACTION PLAN</span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">Micro-Tasks</h1>
          <p className="text-xs text-ink-3 mt-1 max-w-xl">
            Targeted code interventions designed to turn your unproven claims into verifiable GitHub evidence.
          </p>
        </div>
        <span className="font-mono text-xs bg-paper px-3 py-1.5 border border-rule rounded">
          {tasks.length} total tasks
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="p-8 text-center border border-rule bg-card rounded">
          <p className="font-bold text-base text-ink">No outstanding tasks!</p>
          <p className="text-xs text-ink-3 mt-1">All claimed skills have verified public evidence.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map(task => (
            <div key={task.taskId} className="p-5 border border-rule bg-card rounded flex flex-wrap items-center justify-between gap-4 hover:border-ink/40 transition">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2.5">
                  <span className="font-sans font-bold text-base text-ink">{task.label}</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-paper border border-rule text-ink-3">
                    ~{task.estimatedHours}h
                  </span>
                </div>
                <p className="text-xs text-ink-2 leading-relaxed">{task.whyNow}</p>
                {task.starterHint && (
                  <p className="text-[11px] font-mono text-ink-3">
                    Hint: <span className="text-ink">{task.starterHint}</span>
                  </p>
                )}
              </div>

              <Link to={`/student/${id}/tasks/${task.taskId}`}>
                <Button variant="primary" className="text-xs">
                  <span>Work On Task</span>
                  <ArrowRight size={14} className="ml-1" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
