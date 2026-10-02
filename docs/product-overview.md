# Product overview

SkillProof helps candidates and reviewers understand which technical resume claims have public repository support. Its output is an evidence report, not a judgment of competence.

The primary flow is resume + GitHub username → skill report → source evidence → job requirements → Skill Coverage → gap-closing micro-tasks. Job-description extraction can also be used without a candidate; this produces requirements with no candidate coverage or invented gaps.

## Product surfaces

| Route | Purpose |
|---|---|
| `/` | Explain the value and workflow; start an analysis |
| `/analyze` | PDF selection, username, consent, upload/parse feedback |
| `/analysis/:id` | Real pipeline progress, failure retry, or candidate dashboard |
| `/analysis/:id/skills` | Search/filter claimed and GitHub-discovered skills |
| `/analysis/:id/skills/:skill` | Score breakdown, sources, linked repositories, sampled commits |
| `/jobs` | Extract or match required and preferred skills |
| `/jobs/:id` | Coverage, requirement states, gaps, task progress |
| `/reports` | Browser-local history and key import |
| `/methodology` | Server-configured score weights and limitations |

Completed reports are immutable evidence snapshots except for deletion; job task progress is mutable. A new analysis collects new evidence. The interface includes real empty, loading, error, queued, failed, and complete states. There are no seeded candidates, placeholder scores, fabricated timings, or simulated progress stages.

Contact and resume-section extraction is best effort. The skill dictionary is intentionally the primary parser output. Required/preferred job extraction is deterministic and inspectable; ambiguous descriptions should be reviewed by a human.
