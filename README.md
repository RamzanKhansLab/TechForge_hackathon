# SkillProof

> **Auditable Developer Skill Verification Ledger**  
> *Deterministic skill extraction from PDF resumes cross-referenced against public GitHub repository artifacts, commit history, and automated anti-gaming trust signals.*

---

## ⚡ What is SkillProof?

Traditional technical hiring relies on self-reported resume skill bullets or opaque AI resume screeners that hallucinate inferences. **SkillProof** replaces both with an **Auditable Verification Ledger**.

- **Zero LLM Hallucinations**: 100% deterministic ontology matching and graph expansion with decay.
- **Concrete Artifact Evidence**: Every verified point links to actual GitHub manifests, deep file trees, and commit hashes.
- **Anti-Gaming Trust Signals**: Penalizes tutorial clones, commit dumping bursts, empty forks, and vendored code (`node_modules` committed directly).
- **Audit Ledger Design**: Strict high-density tabular typography using *Fraunces* serif headings, *IBM Plex Sans* body, and *IBM Plex Mono* evidence badges with hairline borders.

---

## 🏛️ System Architecture

```text
                               ┌────────────────────────┐
                               │  Candidate PDF Resume  │
                               └───────────┬────────────┘
                                           │ pdf-parse + section parser
                                           ▼
┌──────────────────────┐       ┌────────────────────────┐
│  Public GitHub API   │       │ Skill Extraction Engine│
│ (Repos, Commits, AST)│       │ (250+ Ontological SKUs)│
└──────────┬───────────┘       └───────────┬────────────┘
           │                               │
           ▼                               ▼
┌───────────────────────────────────────────────────────┐
│              Evidence Collector Engine                │
│  - Manifest Parsers (package.json, go.mod, Cargo.toml)│
│  - Code Tree Scan (Imports, extensions, config files) │
│  - Candidate Commit Attribution & Time-span Analysis  │
└──────────────────────────┬────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────┐
│             Anti-Gaming Trust Signal Engine           │
│  - Fork Detection with commit delta check             │
│  - Commit burst & single-dump flagger                 │
│  - README Jaccard boilerplate matcher                 │
│  - Vendored code detection                            │
└──────────────────────────┬────────────────────────────┘
                           │
                           ▼
┌───────────────────────────────────────────────────────┐
│                  Scoring Engine V2                    │
│    Weights: Manifest (20) + Commit Attribution (20)   │
│             + Recency (15) + Complexity/Breadth (15)  │
│             + Time-span (15) + Graph Implication (15) │
│               Multiplied by Trust Factor [0.0 - 1.0]  │
└──────────────────────────┬────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
   ┌──────────────────────┐  ┌──────────────────────┐
   │ Proven (Score >= 70) │  │ Partial (30 <= S <70)│
   └──────────────────────┘  └──────────────────────┘
              │                         │
              └────────────┬────────────┘
                           ▼
   ┌─────────────────────────────────────────────────┐
   │             Discrepancy Analysis                │
   │  - POSITIVE: Discovered unlisted strengths      │
   │  - YEARS_MISMATCH: Experience vs Commit tenure  │
   │  - NO_ARTIFACT: Claimed skills with zero code   │
   └─────────────────────────────────────────────────┘
```

---

## 🔬 Scoring Methodology V2

Every skill is evaluated against an objective, auditable rubric out of 100 possible points:

| Dimension | Max Points | Verification Criteria |
|---|---|---|
| **Manifest Evidence** | 20 pts | Direct dependency or devDependency declared in build manifest |
| **Commit Attribution** | 20 pts | Commits authored by the candidate matching email/username |
| **Recency** | 15 pts | Activity within the last 6 months (scaled decay up to 2 years) |
| **Breadth / Complexity** | 15 pts | Discovered across multiple distinct repositories or subsystems |
| **Time-span Depth** | 15 pts | Active commit history spanning > 12 months on repositories |
| **Graph Implication** | 15 pts | Transitive implication from parent technologies (e.g. Next.js implies React) |

**Classification Thresholds:**
- **PROVEN** (`≥ 70 pts`): Solid multi-repository or multi-file artifact trail with candidate commits.
- **PARTIAL** (`30 - 69 pts`): Documented presence in dependencies or single commits without extended tenure.
- **CLAIMED** (`< 30 pts`): Listed on resume with no public repository artifact backing.

---

## 🛡️ Anti-Gaming Trust Signals

To protect against resume inflation and repository staging, candidate repositories are processed through automated trust heuristics:

1. **`FORK_NO_OWN_COMMITS`**: Candidate forked an active open-source project but authored 0 commits. Multiplier penalized.
2. **`TEMPLATE_OR_TUTORIAL`**: Matches known educational boilerplate names (e.g., `freecodecamp`, `react-tutorial`, `100-days-of-code`) or Create-React-App default README text (Jaccard similarity `> 0.70`).
3. **`SINGLE_COMMIT_DUMP`**: >90% of repository lines created in a single initial commit with no subsequent iterative history.
4. **`COMMIT_BURST`**: Artificial bursts (>20 commits created in <24 hours before interview).
5. **`VENDORED_CODE`**: Committed `node_modules/`, `vendor/`, or `.venv/` inflating language metrics.

---

## 🚀 Key Features

- **Audit Ledger Interface**: Section B high-density theme featuring Fraunces serifs, hairline borders, and inline SVG textured stamps (`--proven`, `--partial`, `--claimed`).
- **Interactive Experience Dumbbell Chart**: Visualizes the delta between candidate-claimed years and verifiable commit history timeline.
- **Skill Detail Slide-Over Drawer**: Click any skill row to view its exact score breakdown, repository links, file paths, and trust audits.
- **Audit Differential & Re-Analysis Mode**: Re-analyze a profile after code changes to view an itemized side-by-side ledger diff with highlighted delta tags.
- **Job Description Reconciliation**: Paste any job description to calculate verified match coverage, identify missing technical requirements, and view tailored micro-tasks.
- **Cryptographic Export & Share Profile**:
  - Export audit dossier as tamper-evident JSON with cryptographic payload hash.
  - Generate embeddable Markdown README badges for GitHub profiles (`[![SkillProof Verified]](...)`).
  - Read-only public share links with capability-based security.
- **⚡ Instant Verified Demo Dossier**: One-click demo loader (`POST /api/analysis/demo`) instantly hydrates a full senior full-stack audit report for presentations without GitHub rate limit bottlenecks.

---

## 💻 Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4, Lucide Icons, Vanilla CSS Design System (`index.css`).
- **Backend**: Node.js 22, Express 5, Mongoose 8, MongoDB Atlas, Multer, `pdf-parse`, Cloudinary SDK.
- **Test Suite**: Native Node.js Test Runner (`node --test`), 21 passing test suites.

---

## 🏃 Quickstart & Installation

### Prerequisites
- Node.js `22.x`
- MongoDB Atlas connection URI or local MongoDB instance

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/RamzanKhansLab/TechForge_hackathon.git
cd TechForge_hackathon
npm ci
npm ci --prefix backend
npm ci --prefix frontend
```

### 2. Configure Environment
Copy `.env.example` templates:
```bash
# Backend configuration
cp backend/.env.example backend/.env

# Frontend configuration
cp frontend/.env.example frontend/.env
```

Fill in `backend/.env`:
```env
PORT=8000
CLIENT_ORIGIN=http://localhost:5173
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/skillproof?retryWrites=true&w=majority
GITHUB_TOKEN=ghp_your_optional_token
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

### 3. Run Dev Server
```bash
# Run both frontend and backend concurrently
npm run dev
```
- Web Application: `http://localhost:5173`
- REST API: `http://localhost:8000/api`

### 4. Run Automated Test Suite
```bash
cd backend
npm test
```
All 21 comprehensive tests covering ontology normalization, anti-gaming algorithms, scoring monotonicity, and differential calculation will execute synchronously.

---

## 🏆 Hackathon Demo Guide

1. Navigate to `http://localhost:5173/analyze`.
2. Click **⚡ Load Verified Demo Dossier** for an immediate, production-grade senior full-stack audit ledger.
3. **Inspect the Dumbbell Chart**: Notice Kubernetes flagged with a `YEARS_MISMATCH` (4 claimed vs 1 verifiable year).
4. **Slide-Over Skill Drawer**: Click on `React` or `Redis` in the Skills Table to see manifest citations, candidate commits, and positive discovered strengths.
5. **Role Reconciliation**: Click **Match to a role**, paste target senior backend requirements, and observe the live coverage delta.
6. **Live Badging & Export**: Click **Share** to copy the GitHub markdown badge or download the cryptographic JSON export file.
