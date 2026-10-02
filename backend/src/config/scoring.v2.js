export const SCORING_V2 = Object.freeze({
  version: '2.0',
  weights: {
    usage: 25,
    recency: 15,
    depth: 20,
    tests: 10,
    deployment: 10,
    readme: 5,
    external: 15
  },
  thresholds: {
    provenScore: 70,
    partialScore: 35,
    maxProvenRecencyMonths: 24
  },
  implicationDecay: {
    directChild: 0.5,
    grandChild: 0.35
  }
});
