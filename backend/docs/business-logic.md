# Backend business logic

The canonical specification is [root business logic](../../docs/business-logic.md). It defines normalization, direct versus supporting signals, weights, thresholds, coverage, job requirements, and task state.

Implementation map:

| Behavior | Source |
|---|---|
| Skill aliases, categories, package names, configuration patterns | `src/data/skills.js` |
| Text matching | `src/services/resume/skillExtractor.js` |
| PDF/contact/section extraction | `src/services/resume/resume.service.js` |
| Raw repository signals | `src/services/github/github.evidence.service.js` |
| Deduplication | `src/services/evidence/evidence.normalizer.js` |
| Weights and thresholds | `src/config/scoring.js` |
| Score computation | `src/services/evidence/evidence.scorer.js` |
| Status classification | `src/services/evidence/evidence.classifier.js` |
| Candidate skill results | `src/services/evidence/evidence.service.js` |
| Required/preferred extraction | `src/services/jobs/jobExtractor.js` |
| Coverage and per-skill matches | `src/services/jobs/matching.service.js` |
| Skill-specific and fallback tasks | `src/data/microTasks.js` |

To add a skill, define one dictionary entry and its relevant dependency mappings. Add specialized file collection/configuration rules only when they communicate defensible evidence semantics. Add an optional dedicated micro-task recipe; all dictionary skills already have a concrete fallback. Update the score version and documentation when changing scoring semantics. Existing reports remain snapshots, not silently recalculated results.
