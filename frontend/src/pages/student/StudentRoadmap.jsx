import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { coachApi } from '../../services/api/coachApi.js';
import { Loading, ErrorNotice } from '../../components/common/UI.jsx';
import { Button, KeyBox } from '../../ui/index.js';
import { Calendar, Clock, ChevronRight, CheckCircle2, ArrowRight } from 'lucide-react';

export default function StudentRoadmap() {
  const { id } = useParams();
  const [hoursPerWeek, setHoursPerWeek] = useState(6);
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoadmap = async (hours) => {
    try {
      setLoading(true);
      setError(null);
      const res = await coachApi.getRoadmap(id, { hoursPerWeek: hours });
      setRoadmap(res.data || res);
    } catch (err) {
      setError(err.message || 'Failed to load roadmap.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoadmap(hoursPerWeek);
  }, [id, hoursPerWeek]);

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-6">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">COACH EXECUTION PLAN</span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink mt-1">Proof Roadmap</h1>
          <p className="text-xs text-ink-3 mt-1 max-w-xl">
            Topologically ordered learning path based on prerequisite DAG, difficulty, and your saved target roles.
          </p>
        </div>

        {/* Hours per week selector */}
        <div className="flex items-center gap-2 bg-paper p-2 border border-rule rounded">
          <Clock size={16} className="text-ink-3" />
          <span className="text-xs font-mono text-ink-2">Hours / week:</span>
          {[4, 6, 10, 15].map(hrs => (
            <button
              key={hrs}
              onClick={() => setHoursPerWeek(hrs)}
              className={`px-2.5 py-1 text-xs font-mono rounded transition ${
                hoursPerWeek === hrs
                  ? 'bg-ink text-paper font-bold'
                  : 'bg-card text-ink-3 hover:text-ink border border-rule'
              }`}
            >
              {hrs}h
            </button>
          ))}
        </div>
      </div>

      {loading && <Loading text="Recalculating weekly packing..." />}
      {error && <ErrorNotice error={error} retry={() => fetchRoadmap(hoursPerWeek)} />}

      {!loading && roadmap && (
        <>
          {/* Metrics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KeyBox label="TOTAL HOURS" value={`${roadmap.totalHours}h`} annotation="Estimated" />
            <KeyBox label="ESTIMATED WEEKS" value={roadmap.estimatedWeeks} annotation={`At ${roadmap.hoursPerWeek}h/wk`} />
            <KeyBox label="ROADMAP TASKS" value={roadmap.orderedTasks?.length || 0} annotation="Micro-tasks" />
            <KeyBox label="STATUS" value="Topological" annotation="DAG ordered" />
          </div>

          {/* Weekly Plan Accordion / Timeline */}
          <div className="space-y-6">
            <h2 className="font-mono text-xs uppercase tracking-widest font-bold text-ink">WEEKLY PROGRESSION</h2>

            {roadmap.weeklyPlan?.length === 0 ? (
              <div className="p-8 text-center border border-rule bg-card rounded">
                <CheckCircle2 size={32} className="mx-auto text-forest mb-2" />
                <p className="font-bold text-base text-ink">All target skills proven!</p>
                <p className="text-xs text-ink-3 mt-1">No outstanding skill gaps found for your current target roles.</p>
              </div>
            ) : (
              roadmap.weeklyPlan.map(week => (
                <div key={week.week} className="border border-rule bg-card rounded-[2px] overflow-hidden">
                  <div className="bg-paper px-5 py-3 border-b border-rule flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-forest" />
                      <span className="font-mono text-xs font-bold text-ink">WEEK {week.week}</span>
                    </div>
                    <span className="font-mono text-xs text-ink-3">
                      {week.hoursThisWeek}h of {roadmap.hoursPerWeek}h allocated
                    </span>
                  </div>

                  <div className="divide-y divide-rule">
                    {week.items.map(item => (
                      <div key={item.skillId} className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-paper/50 transition">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5">
                            <span className="font-sans font-bold text-sm text-ink">{item.label}</span>
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-paper border border-rule text-ink-3">
                              {item.partNumber && item.totalParts ? `Part ${item.partNumber}/${item.totalParts} (${item.allocatedHours}h)` : `${item.allocatedHours}h`}
                            </span>
                          </div>
                          <p className="text-xs text-ink-2 max-w-xl">{item.whyNow}</p>
                          {item.starterHint && (
                            <p className="text-[11px] font-mono text-ink-3">
                              Starter hint: <span className="text-ink">{item.starterHint}</span>
                            </p>
                          )}
                        </div>

                        <Link to={`/student/${id}/tasks/${item.taskId}`}>
                          <Button variant="secondary" className="text-xs">
                            <span>Open Micro-Task</span>
                            <ChevronRight size={14} className="ml-1" />
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
