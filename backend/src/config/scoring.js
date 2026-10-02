export const SCORING = Object.freeze({
  version: '1.0',
  weights: { dependency: 30, configuration: 30, language: 30, source: 25, readme: 10, multipleRepositories: 20, commitActivity: 10, recentActivity: 10, testing: 10, deployment: 10 },
  thresholds: { proven: 60, partial: 15 },
  coverage: { Proven: 1, Partial: 0.5, 'Claimed-only': 0 },
});
