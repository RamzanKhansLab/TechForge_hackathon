import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import { Analysis } from '../../models/Analysis.js';
import { newAccess, publicDocument } from '../../utils/access.js';

export const SAMPLE_CANDIDATE_DATA = {
  githubUsername: 'demo-engineer',
  candidate: {
    name: 'Alex Morgan',
    email: 'alex.morgan.demo@example.com',
    phone: '+1 (555) 234-5678'
  },
  resume: {
    filename: 'Alex_Morgan_FullStack_Resume.pdf',
    pages: 2,
    asset: {
      public_id: 'sample_resume_demo',
      secure_url: 'https://example.com/resumes/sample.pdf',
      resource_type: 'raw',
      type: 'authenticated',
      format: 'pdf',
      bytes: 42100
    },
    skills: ['javascript', 'typescript', 'react', 'nodejs', 'express', 'docker', 'mongodb', 'postgresql', 'redis', 'kubernetes', 'aws'],
    detailedSkills: [
      { id: 'react', claimedYears: 4, claimedSince: 2022 },
      { id: 'nodejs', claimedYears: 3, claimedSince: 2023 },
      { id: 'docker', claimedYears: 2, claimedSince: 2024 },
      { id: 'mongodb', claimedYears: 3, claimedSince: 2023 },
      { id: 'kubernetes', claimedYears: 5, claimedSince: 2021 } // intentional mismatch for discrepancy report!
    ],
    experience: [
      'Senior Full Stack Engineer at Acquired Labs (2023 - Present)',
      'Built high-throughput RESTful services using Node.js, Express, and PostgreSQL.',
      'Containerized multi-service architecture using Docker and deployed with GitHub Actions.'
    ],
    projects: [
      'OpenTelemetry Trace Visualizer - React, TypeScript, TailwindCSS',
      'Event-driven Ledger Worker - Node.js, Redis, MongoDB'
    ]
  },
  github: {
    login: 'demo-engineer',
    name: 'Alex Morgan',
    avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4',
    url: 'https://github.com/demo-engineer',
    bio: 'Systems builder & distributed services engineer. Open source contributor.',
    publicRepos: 18,
    followers: 42
  },
  repositories: [
    {
      name: 'micro-ledger-service',
      fullName: 'demo-engineer/micro-ledger-service',
      url: 'https://github.com/demo-engineer/micro-ledger-service',
      description: 'Distributed ledger service with idempotency keys and Redis rate-limiting.',
      defaultBranch: 'main',
      stars: 38,
      updatedAt: new Date(),
      languages: { JavaScript: 15400, TypeScript: 42000 },
      commitCount: 64,
      commitsLast30Days: 12,
      commitsLast90Days: 28,
      latestCommit: new Date(),
      firstCommit: new Date('2023-01-15'),
      testingDetected: true,
      testingFramework: ['jest'],
      deploymentDetected: true,
      deploymentPlatform: ['docker', 'github-actions'],
      readme: {
        description: 'Distributed ledger service with idempotency keys',
        setupInstructions: true,
        deploymentLinks: ['https://demo-ledger.example.com']
      },
      filesInspected: ['package.json', 'Dockerfile', '.github/workflows/ci.yml', 'README.md'],
      evidence: [
        {
          deterministicId: 'ev_pkg_express_demo',
          type: 'dependency',
          skill: 'express',
          skillId: 'express',
          repository: 'micro-ledger-service',
          repo: 'micro-ledger-service',
          file: 'package.json',
          path: 'package.json',
          description: 'Production manifest dependency express declared in package.json',
          strength: 'direct',
          weight: 1.0,
          date: new Date()
        },
        {
          deterministicId: 'ev_pkg_react_demo',
          type: 'dependency',
          skill: 'react',
          skillId: 'react',
          repository: 'micro-ledger-service',
          repo: 'micro-ledger-service',
          file: 'package.json',
          path: 'package.json',
          description: 'Frontend manifest dependency react declared in package.json',
          strength: 'direct',
          weight: 1.0,
          date: new Date()
        }
      ]
    }
  ],
  skills: [
    {
      id: 'react',
      name: 'React',
      category: 'Frontend',
      claimed: true,
      status: 'Proven',
      verdict: 'Proven',
      score: 92,
      claimedYears: 4,
      verifiedYears: 3.5,
      reasons: ['Direct dependency in active production repositories', 'Active candidate commits across 4 years of history'],
      repositories: ['micro-ledger-service'],
      breakdown: [
        { rule: 'Manifest usage', points: 25, evidenceId: 'ev_pkg_react_demo' },
        { rule: 'Recency of contributions', points: 15 },
        { rule: 'Code volume and depth', points: 18 },
        { rule: 'Testing framework setup', points: 10 },
        { rule: 'CI/CD and deployment', points: 10 },
        { rule: 'Documentation quality', points: 5 },
        { rule: 'External PR activity', points: 9 }
      ],
      evidence: [
        {
          type: 'dependency',
          repository: 'micro-ledger-service',
          file: 'package.json',
          description: 'Manifest dependency react declared in package.json',
          strength: 'direct',
          url: 'https://github.com/demo-engineer/micro-ledger-service/blob/main/package.json',
          date: new Date()
        }
      ]
    },
    {
      id: 'nodejs',
      name: 'Node.js',
      category: 'Backend',
      claimed: true,
      status: 'Proven',
      verdict: 'Proven',
      score: 88,
      claimedYears: 3,
      verifiedYears: 3.0,
      reasons: ['Direct backend service implementation', 'Consistent multi-year commit history'],
      repositories: ['micro-ledger-service'],
      breakdown: [
        { rule: 'Manifest usage', points: 25 },
        { rule: 'Recency of contributions', points: 15 },
        { rule: 'Code volume and depth', points: 16 },
        { rule: 'Testing framework setup', points: 10 },
        { rule: 'CI/CD and deployment', points: 10 },
        { rule: 'Documentation quality', points: 5 },
        { rule: 'External PR activity', points: 7 }
      ],
      evidence: [
        {
          type: 'runtime',
          repository: 'micro-ledger-service',
          file: 'package.json',
          description: 'Node.js runtime engines definition and scripts',
          strength: 'direct',
          url: 'https://github.com/demo-engineer/micro-ledger-service/blob/main/package.json',
          date: new Date()
        }
      ]
    },
    {
      id: 'docker',
      name: 'Docker',
      category: 'DevOps',
      claimed: true,
      status: 'Proven',
      verdict: 'Proven',
      score: 82,
      claimedYears: 2,
      verifiedYears: 2.2,
      reasons: ['Multi-stage Dockerfile present with non-root security standards'],
      repositories: ['micro-ledger-service'],
      breakdown: [
        { rule: 'Container configuration', points: 25 },
        { rule: 'Recency of contributions', points: 15 },
        { rule: 'CI/CD workflow integration', points: 20 },
        { rule: 'Documentation quality', points: 5 },
        { rule: 'Production deployment', points: 17 }
      ],
      evidence: [
        {
          type: 'deployment',
          repository: 'micro-ledger-service',
          file: 'Dockerfile',
          description: 'Multi-stage Docker container build definition',
          strength: 'direct',
          url: 'https://github.com/demo-engineer/micro-ledger-service/blob/main/Dockerfile',
          date: new Date()
        }
      ]
    },
    {
      id: 'kubernetes',
      name: 'Kubernetes',
      category: 'DevOps',
      claimed: true,
      status: 'Claimed-only',
      verdict: 'Claimed-only',
      score: 15,
      claimedYears: 5,
      verifiedYears: 0,
      reasons: ['Claimed 5 years in resume, but 0 Kubernetes manifests found in public repos'],
      repositories: [],
      breakdown: [],
      evidence: []
    },
    {
      id: 'redis',
      name: 'Redis',
      category: 'Database',
      claimed: false, // Discovered hidden strength!
      status: 'Proven',
      verdict: 'Proven',
      score: 76,
      reasons: ['Direct Redis client integration discovered in micro-ledger-service'],
      repositories: ['micro-ledger-service'],
      breakdown: [
        { rule: 'Manifest usage', points: 25 },
        { rule: 'Recency of contributions', points: 15 },
        { rule: 'Code volume and depth', points: 14 },
        { rule: 'Testing framework setup', points: 10 },
        { rule: 'Documentation quality', points: 5 },
        { rule: 'External PR activity', points: 7 }
      ],
      evidence: [
        {
          type: 'dependency',
          repository: 'micro-ledger-service',
          file: 'package.json',
          description: 'ioredis declared in package dependencies',
          strength: 'direct',
          url: 'https://github.com/demo-engineer/micro-ledger-service/blob/main/package.json',
          date: new Date()
        }
      ]
    }
  ],
  discrepancyReport: [
    {
      type: 'YEARS_MISMATCH',
      skillId: 'kubernetes',
      severity: 'high',
      message: 'Candidate claims 5 years of Kubernetes experience in resume, but verifiable commit timeline spans 0 years across inspected public repositories.',
      evidenceLinks: []
    },
    {
      type: 'NO_ARTIFACT',
      skillId: 'aws',
      severity: 'medium',
      message: 'Skill "aws" claimed on resume has zero detected configuration, IaC, or deployment manifests in public code.',
      evidenceLinks: []
    },
    {
      type: 'POSITIVE',
      skillId: 'redis',
      severity: 'positive',
      message: 'Unlisted Hidden Strength: "redis" discovered with 76/100 evidence score in micro-ledger-service.',
      evidenceLinks: ['https://github.com/demo-engineer/micro-ledger-service']
    }
  ],
  summary: {
    claimed: 5,
    proven: 3,
    partial: 1,
    claimedOnly: 1,
    repositoriesAnalyzed: 1,
    discovered: 1,
    coveragePercentage: 60,
    trustNote: 'Full code-level evidence verified.'
  },
  status: 'completed',
  stage: 'completed',
  progress: 100,
  scoringVersion: '2.0',
  isPublic: true,
  shareId: 'demo-sample-audit',
  completedAt: new Date()
};

// 64-character hex access token for demo reports
const DEMO_ACCESS_TOKEN = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const DEMO_ACCESS_TOKEN_HASH = createHash('sha256').update(DEMO_ACCESS_TOKEN).digest('hex');

/**
 * Ensures a preloaded demo report exists in the database.
 * Returns public document and access token.
 */
export async function seedDemoReport() {
  const existing = await Analysis.findOne({ githubUsername: 'demo-engineer', status: 'completed' });
  if (existing) {
    // Ensure the existing demo report has the known demo token hash and public settings
    await Analysis.updateOne(
      { _id: existing._id },
      { $set: { accessTokenHash: DEMO_ACCESS_TOKEN_HASH, isPublic: true, shareId: existing.shareId || 'demo-sample-audit' } }
    );
    return {
      analysisId: existing._id,
      shareId: existing.shareId || 'demo-sample-audit',
      accessToken: DEMO_ACCESS_TOKEN
    };
  }

  const report = await Analysis.create({
    ...SAMPLE_CANDIDATE_DATA,
    accessTokenHash: DEMO_ACCESS_TOKEN_HASH
  });

  return {
    analysisId: report._id,
    shareId: report.shareId,
    accessToken: DEMO_ACCESS_TOKEN
  };
}
