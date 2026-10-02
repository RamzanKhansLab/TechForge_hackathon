// Compatibility shim for existing data/skills.js imports backed by ontology
import { ONTOLOGY, ONTOLOGY_MAP, normalize } from '../ontology/ontology.service.js';

export const SKILLS = ONTOLOGY.map(s => ({
  id: s.id,
  name: s.label,
  category: s.category,
  aliases: s.aliases || [],
  packages: s.hints?.npm || []
}));

export const SKILL_MAP = Object.fromEntries(SKILLS.map(skill => [skill.id, skill]));

export const LANGUAGE_MAP = {
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  Python: 'python',
  Java: 'java',
  'C#': 'csharp',
  'C++': 'cpp',
  Go: 'go',
  Rust: 'rust',
  PHP: 'php',
  Ruby: 'ruby',
  Swift: 'swift',
  Kotlin: 'kotlin',
  HTML: 'html',
  CSS: 'css',
  Scala: 'scala',
  Dart: 'dart',
  Elixir: 'elixir',
  Clojure: 'clojure',
  SQL: 'sql',
  Shell: 'bash'
};

export const CONFIG_RULES = [
  { pattern: /(^|\/)Dockerfile(?:\.[^/]*)?$|(^|\/)docker-compose\.ya?ml$|(^|\/)compose\.ya?ml$/i, skill: 'docker' },
  { pattern: /(^|\/)\.github\/workflows\/[^/]+\.ya?ml$/, skill: 'cicd' },
  { pattern: /\.tf$/, skill: 'terraform' },
  { pattern: /(^|\/)vercel\.json$/, skill: 'vercel' },
  { pattern: /(^|\/)netlify\.toml$/, skill: 'netlify' },
  { pattern: /(^|\/)prisma\/schema\.prisma$/, skill: 'prisma' },
];
