# SkillProof

> **Auditable Developer Skill Verification Ledger**  
> *Deterministic skill extraction from PDF resumes cross-referenced against public GitHub repository artifacts, commit history, and automated anti-gaming trust signals.*

---

## 👥 Team & Submission Information

### 1. Team Details
- **Team Name**: SkillProof Engineers
- **Team Members**: Aman Mishra, Kartik Nair, Ramzan Khan

### 2. Problem Statement
- **Problem Statement Name**: Verification & Validation of Developer Skill Claims in Technical Hiring
- **Selected Domain**: EdTech / HRTech / Automated Skill Verification & Hiring Infrastructure

### 3. Project Details
- **Project Title**: SkillProof - Auditable Developer Skill Verification Ledger
- **Short Description**: SkillProof is a deterministic skill verification platform that eliminates resume inflation and opaque AI screener hallucinations by matching PDF resume claims directly against public GitHub repository artifacts, build manifests, and commit history. It generates an auditable, score-backed evidence ledger classified as `Proven`, `Partial`, or `Claimed-only` with automated anti-gaming trust checks. The platform empowers candidates with actionable learning roadmaps while providing recruiters with tamper-evident evidence sheets and job-matching matrices.

---

## ⚡ Project Overview

Traditional technical hiring relies heavily on self-reported resume bullets or black-box AI resume screeners that frequently hallucinate inferences. **SkillProof** replaces both with a **Deterministic Verification Ledger**:

- **Zero LLM Hallucinations**: 100% deterministic ontology matching and graph expansion with recency and depth decay.
- **Concrete Artifact Evidence**: Every verified skill links to real GitHub build manifests (`package.json`, `go.mod`, `Cargo.toml`), file AST trees, and candidate commit hashes.
- **Anti-Gaming Trust Signals**: Automated algorithms detect and penalize tutorial clones, commit dumping bursts, empty forks, and vendored code (`node_modules` committed directly).
- **Dual Lens Design**: 
  - **Student Lab Notebook**: Warm paper-based workspace with readiness summaries, DAG learning roadmaps, resume bullet fixes, and micro-task verification.
  - **Recruiter Case Desk**: High-density cool steel desk for talent acquisition with candidate share verification, requirement matrices, and audit evidence sheets.

---

## 🏛️ Architecture & Workflow

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

**Classification Verdicts:**
- **PROVEN** (`≥ 70 pts`): Solid multi-repository or multi-file artifact trail with candidate commits.
- **PARTIAL** (`30 - 69 pts`): Documented presence in dependencies or single commits without extended tenure.
- **CLAIMED-ONLY** (`< 30 pts`): Listed on resume with no public repository artifact backing.

---

## 🛡️ Anti-Gaming Trust Signals

Candidate repositories are automatically screened through trust heuristics:

1. **`FORK_NO_OWN_COMMITS`**: Candidate forked an active open-source project but authored 0 commits.
2. **`TEMPLATE_OR_TUTORIAL`**: Matches known educational boilerplate names (`freecodecamp`, `react-tutorial`, `100-days-of-code`) or CRA default README text (Jaccard similarity `> 0.70`).
3. **`SINGLE_COMMIT_DUMP`**: >90% of repository lines created in a single initial commit with no subsequent iterative history.
4. **`COMMIT_BURST`**: Artificial bursts (>20 commits created in <24 hours before submission).
5. **`VENDORED_CODE`**: Committed `node_modules/`, `vendor/`, or `.venv/` inflating language metrics.

---

## 🚀 Key Features

### For Candidates (Student Lab Notebook)
- **Proof Readiness Summary**: Instant overview of claimed vs. proven vs. partial skills with custom verdict stamps.
- **Interactive Experience Dumbbell Chart**: Visualizes claimed experience vs. verifiable commit history timeline.
- **DAG Learning Roadmap**: Topologically sorted learning path based on prerequisite dependencies and difficulty.
- **Resume Bullet Fix Generator**: Auto-generated bullet point improvements tailored to verified evidence.
- **Micro-Task Verification Workspace**: Interactive micro-tasks with live GitHub commit checking to upgrade `Partial` or `Claimed` skills to `Proven`.

### For Recruiters (Recruiter Case Desk)
- **Shared Profile Verification**: Access revoked-gated candidate share profiles with strict organisation access audit logging.
- **Requirement Matching Matrix**: Compare candidate evidence directly against job descriptions with percentage match scores and gap breakdowns.
- **Audit Evidence Sheet**: Deep dive into manifest citations, commit SHA links, and anti-gaming flag notes.

---

## 💻 Technology Stack

- **Frontend**: React 19, Vite, React Router 7, Tailwind CSS 4, Lucide Icons, Custom Design Tokens (`Fraunces` & `IBM Plex`).
- **Backend**: Node.js 22, Express 5, Mongoose 8, MongoDB Atlas, Multer, `pdf-parse`, Cloudinary SDK, Zod, Helmet.
- **Authentication & Security**: HttpOnly Cookie Sessions, JWT access tokens, double-submit CSRF protection, rate-limiting, and owner-isolated queries.
- **Test Suite**: Native Node.js Test Runner (`node --test`), 25+ integration & unit test files.

---

## 📡 Dataset & API Information

- **GitHub REST API v3**: Fetches repository metadata, commit histories, trees, and file contents deterministically.
- **Ontology Dataset**: Built-in 250+ technical skills ontology mapping technologies, package names (`package.json`, `PyPI`, `Go`), file extensions, and DAG relationships.
- **Cloudinary Storage API**: Secure authenticated PDF resume storage with metadata indexed in MongoDB Atlas.

---

## 🏃 Setup & Installation Instructions

### Prerequisites
- Node.js `22.x`
- MongoDB Atlas connection URI or local MongoDB instance

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/RamzanKhansLab/TechForge_hackathon.git
cd TechForge_hackathon
npm run setup
```

### 2. Configure Environment
Copy `.env.example` templates in both `backend` and `frontend`:
```bash
cp backend/.env.example backend/.env
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
JWT_SECRET=replace-with-a-random-32-character-minimum-secret
REFRESH_SECRET=replace-with-a-different-random-32-character-minimum-secret
COOKIE_SECRET=replace-with-a-random-32-character-minimum-secret
COOKIE_SECURE=false
```

### 3. Start Local Servers
```bash
# Start frontend and backend concurrently
npm run dev
```
- **Frontend App**: `http://localhost:5173`
- **REST API**: `http://localhost:8000/api`

### 4. Run Automated Test Suite
```bash
npm test --prefix backend
```

---

## 📸 Screenshots & Demo Information

### Demo Walkthrough
1. **Landing & Authentication**: Register or sign in as a **Student** or **Recruiter**.
2. **Analysis Creation**: Upload a PDF resume and enter a GitHub username.
3. **Student View (`/student`)**:
   - Inspect **Readiness Overview** and total skill counts.
   - Click **Get Share Link** to generate a public capability URL for recruiters.
   - Explore **Proof Roadmap**, **Resume Fixes**, and **Micro-Tasks**.
4. **Recruiter View (`/recruiter`)**:
   - Open a shared candidate link or paste a job description.
   - View high-density requirement matrices and audit evidence details.

---

## 🔮 Limitations & Future Scope

### Current Limitations
- **Public GitHub Only**: Analysis is intentionally restricted to public GitHub repositories to remain deterministic and non-intrusive.
- **Deterministic MVP**: No private repo code execution, OCR, or LLM-based code generation.
- **GitHub Rate Limits**: Unauthenticated GitHub API calls are capped at 60 requests/hr (resolved by supplying `GITHUB_TOKEN`).

### Future Scope
- **GitLab & Bitbucket Integration**: Expand evidence collection to other public version control platforms.
- **Verifiable Cryptographic Proofs**: Issue W3C Verifiable Credentials (VCs) for proven skill claims.
- **Org-Level Recruiter Teams**: Multi-tenant employer accounts with candidate comparison shortlists.
