# Evidence and matching rules

Implementation sources: `backend/src/data/skills.js`, `config/scoring.js`, `services/evidence/`, `services/resume/skillExtractor.js`, `services/jobs/`, and `data/microTasks.js`.

## Skill extraction

Each dictionary entry has a canonical ID, display name, category, aliases, and dependency package names. Matching is case-insensitive with alphanumeric boundaries. This avoids matching Java inside JavaScript. The ordinary verb `go` is not a lowercase alias; explicit Golang phrases or canonical `Go` spelling are recognized. Short aliases and ambiguous words can still misclassify text. Extend aliases centrally rather than in controllers.

PDF parsing checks the header, extracts text from at most 15 pages, and processes at most 100,000 characters. It heuristically extracts name, email, phone, education, projects, experience, and certifications from line headings. Categories are derived from recognized skills. OCR, semantic experience understanding, and arbitrary layout reconstruction are not implemented.

## Collection and normalization

Direct signals include GitHub language bytes (minimum 100), manifest dependencies, and recognizable configuration paths/content. README technology mentions are supporting signals. Repeated signals are deduplicated by skill + type + repository + file. Additional discovered skills must have a direct signal; weak README mentions alone do not add unclaimed skills to a candidate report.

Repository context includes test paths, deployment configuration, candidate-attributed commits, and activity within 90 days. Context is attached only to directly evidenced skills in the same repository. These are explicitly described as repository-level signals, not skill-specific contributions.

## Scoring version 1.0

| Rule | Points | Condition |
|---|---:|---|
| Dependency | 30 | Dependency declaration in a recognized manifest |
| Configuration | 30 | Relevant config path/content |
| Language | 30 | At least 100 language bytes from GitHub |
| Source | 25 | Reserved direct-signal weight; current collector does not infer skills from generic source filenames |
| Multiple repositories | 20 | Direct signals in at least two distinct repositories |
| Candidate commit activity | 10 | Candidate-attributed commits in a directly evidenced repository |
| Recent activity | 10 | Candidate-attributed repository commit within 90 days |
| README | 10 | Technology mention in an inspected README |
| Testing | 10 | Test-path indicators in a directly evidenced repository |
| Deployment | 10 | Deployment configuration in a directly evidenced repository |

The base score is the **maximum**, not the sum, of dependency/configuration/language/source weights. Every supporting rule contributes at most once across the entire skill. Total is capped at 100. Commit count does not multiply points, and numerous repeated declarations do not inflate the score.

```text
base = maximum direct-signal weight, or 0
score = min(100, base + applicable one-time supporting rules)
```

`Proven`: at least 60 and at least one direct signal. `Partial`: at least 15 but not Proven. `Claimed-only`: below 15. README-only evidence is 10 and cannot become Proven. Statuses are exact API values, including capitalization and the hyphen.

For example, one dependency declaration (30), candidate-authored repository activity (10), and recent activity (10) produces 50, classified Partial. Adding a test-path indicator (10) gives 60 and Proven. This example explains the rule; it is not seeded application data or a competence assertion.

Dashboard counts Proven/Partial/Claimed-only among **resume-claimed skills**. GitHub-discovered skills are counted separately. The skill table and job matching include both groups. A report stores the scoring version so older snapshots are not silently rescored when config changes.

## Job extraction

Descriptions are split into lines/sentences and simple clauses. Explicit required and preferred headings set section context; preferred/optional/bonus wording marks local clauses as preferred. An explicit required occurrence wins over a preferred occurrence of the same skill. Dictionary matches with no preference signal default to required. The original description is retained to make extraction reviewable. Negation and mixed prose remain heuristic limitations.

## Matching and coverage

For each required skill, Proven → Verified, Partial → Partial, and Claimed-only or absent → Gap. Responses include the original candidate status, score, evidence, and reason.

```text
Skill Coverage = (Verified + Partial × 0.5) / total required skills × 100
```

Coverage is rounded to the nearest integer. Preferred skills never enter the denominator. Zero required skills returns `null`, not 0 or 100. A job analyzed without a candidate also returns `null` and empty matches/tasks; it does not invent candidate gaps.

## Micro-tasks

Every Gap and Partial requirement receives a task. The catalog contains skill-specific recipes for common technologies and a concrete fallback recipe for every other dictionary skill. Tasks have a title, description, difficulty, time estimate, expected outputs, and personal `todo`, `in-progress`, or `done` state. No points are awarded for checking a box. Publish the outputs, then create a new candidate analysis to recollect evidence.
