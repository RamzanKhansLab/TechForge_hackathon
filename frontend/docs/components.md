# Components and responsibilities

| Component | Responsibility |
|---|---|
| `AppLayout` | Desktop sidebar, mobile navigation, route frame, storage warning |
| `UI` | Logo, semantic badges, safe external links, loading/errors/empty states, headings, notes |
| `ErrorBoundary` | Recoverable root render-error fallback |
| `AccessKey` | Report-key import and download |
| `ResumeUpload` | Keyboard-accessible file picker, drag/drop, selected-file state |
| `AnalysisProgress` | Real backend stages, failure reason, retry |
| `ReportGate` | Analysis loading/error/access/status boundary |
| `OverviewChart` | Claimed-skill distribution with text legend |
| `RepositoryCard` | Public repository metadata, languages, activity, collection warnings |
| `SkillTable` | Search/category text matching, status filter, score bars, evidence navigation |
| `EvidenceList` | Auditable direct/supporting signals with source URLs |
| `TaskCard` | Task output checklist and persistent personal progress |

Pages assemble these components. Business scoring and matching stay on the backend. Small display-only helpers live in `utils/format.js`; fallback skill labels are for presentation, not extraction or matching.

`ReportContext.jsx` and `main.jsx` also have matching CSS files, consistent with the requested naming convention. A few composition-only files intentionally contain no custom CSS beyond comments because shared tokens and Tailwind utilities are sufficient.
