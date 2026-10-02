/**
 * Compares two completed analysis snapshots to produce an audit ledger diff:
 * - scoreDelta: overall total score change
 * - newlyProven: skills that progressed from Partial/Claimed-Only to Proven
 * - improvedSkills: array of { skillId, name, oldScore, newScore, delta, oldStatus, newStatus }
 * - newEvidence: new evidence items found in recent analysis
 * - summaryDelta: changes in claimed, proven, partial counts
 */
export function computeAnalysisDiff(previousAnalysis, currentAnalysis) {
  if (!previousAnalysis || !currentAnalysis) {
    return null;
  }

  const prevSkillsMap = new Map((previousAnalysis.skills || []).map(s => [s.id, s]));
  const currSkills = currentAnalysis.skills || [];

  const newlyProven = [];
  const improvedSkills = [];
  let totalOldScore = 0;
  let totalNewScore = 0;

  for (const curr of currSkills) {
    totalNewScore += (curr.score || 0);
    const prev = prevSkillsMap.get(curr.id);

    if (prev) {
      totalOldScore += (prev.score || 0);
      const delta = (curr.score || 0) - (prev.score || 0);

      if (prev.status !== 'Proven' && curr.status === 'Proven') {
        newlyProven.push({
          id: curr.id,
          name: curr.name,
          category: curr.category,
          oldScore: prev.score || 0,
          newScore: curr.score || 0,
          delta
        });
      }

      if (delta !== 0 || prev.status !== curr.status) {
        improvedSkills.push({
          id: curr.id,
          name: curr.name,
          category: curr.category,
          oldScore: prev.score || 0,
          newScore: curr.score || 0,
          delta,
          oldStatus: prev.status,
          newStatus: curr.status
        });
      }
    } else {
      // Discovered skill in new analysis
      if (curr.status === 'Proven') {
        newlyProven.push({
          id: curr.id,
          name: curr.name,
          category: curr.category,
          oldScore: 0,
          newScore: curr.score || 0,
          delta: curr.score || 0
        });
      }
      improvedSkills.push({
        id: curr.id,
        name: curr.name,
        category: curr.category,
        oldScore: 0,
        newScore: curr.score || 0,
        delta: curr.score || 0,
        oldStatus: 'Not Evaluated',
        newStatus: curr.status
      });
    }
  }

  // Calculate summary deltas
  const prevSummary = previousAnalysis.summary || {};
  const currSummary = currentAnalysis.summary || {};

  return {
    previousAnalysisId: previousAnalysis._id,
    currentAnalysisId: currentAnalysis._id,
    previousDate: previousAnalysis.completedAt || previousAnalysis.createdAt,
    currentDate: currentAnalysis.completedAt || currentAnalysis.createdAt,
    scoreDelta: totalNewScore - totalOldScore,
    newlyProvenCount: newlyProven.length,
    newlyProven,
    improvedSkills,
    summaryDelta: {
      proven: (currSummary.proven || 0) - (prevSummary.proven || 0),
      partial: (currSummary.partial || 0) - (prevSummary.partial || 0),
      discovered: (currSummary.discovered || 0) - (prevSummary.discovered || 0)
    }
  };
}
