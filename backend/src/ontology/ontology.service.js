import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const skillsPath = path.join(__dirname, 'skills.json');
const rawSkills = JSON.parse(fs.readFileSync(skillsPath, 'utf8'));

export const ONTOLOGY = rawSkills;
export const ONTOLOGY_MAP = new Map(ONTOLOGY.map(s => [s.id, s]));

// Build lookup dictionary for normalize()
// Lowercased alias -> skillId
const aliasMap = new Map();
const ambiguousSkills = new Set(['go', 'r', 'c', 'express', 'swift', 'rust', 'spring', 'flask', 'pandas']);

for (const skill of ONTOLOGY) {
  aliasMap.set(skill.id.toLowerCase(), skill.id);
  aliasMap.set(skill.label.toLowerCase(), skill.id);
  for (const alias of skill.aliases || []) {
    aliasMap.set(alias.toLowerCase(), skill.id);
  }
}

/**
 * Normalizes an input term to a canonical skill ID if matched.
 * Accounts for punctuation variations like React.js, ReactJS, node js, C++, C#.
 */
export function normalize(rawText = '') {
  if (typeof rawText !== 'string' || !rawText.trim()) return null;
  const cleaned = rawText.trim().toLowerCase();

  if (aliasMap.has(cleaned)) return aliasMap.get(cleaned);

  // Strip common suffixes/prefixes like .js, js, framework, library
  const normalized = cleaned
    .replace(/\.js\b/i, 'js')
    .replace(/\b(framework|library|sdk|tools?)\b/gi, '')
    .trim();

  if (aliasMap.has(normalized)) return aliasMap.get(normalized);

  // Exact mappings for tricky names
  if (cleaned === 'c++' || cleaned === 'cpp') return 'cpp';
  if (cleaned === 'c#' || cleaned === 'csharp' || cleaned === 'c sharp') return 'csharp';
  if (cleaned === 'golang') return 'go';
  if (cleaned === 'node' || cleaned === 'nodejs' || cleaned === 'node.js') return 'nodejs';
  if (cleaned === 'react' || cleaned === 'reactjs' || cleaned === 'react.js') return 'react';
  if (cleaned === 'vue' || cleaned === 'vuejs' || cleaned === 'vue.js') return 'vue';
  if (cleaned === 'next' || cleaned === 'nextjs' || cleaned === 'next.js') return 'nextjs';
  if (cleaned === 'postgres' || cleaned === 'psql') return 'postgresql';

  return null;
}

/**
 * Parse years or since-year mentions near a skill in a text snippet.
 * Patterns supported:
 *  - "3 years of Python", "3+ yrs Python", "Python - 3 years", "Python: 3 yrs"
 *  - "Python (2021-present)", "Python, 2020-2023", "since 2021"
 */
export function parseYears(text = '', skillAliases = []) {
  if (!text || typeof text !== 'string') return { claimedYears: null, claimedSince: null };

  const currentYear = new Date().getFullYear();
  let claimedYears = null;
  let claimedSince = null;

  // 1. "3 years of Python" or "3+ yrs Python"
  const prefixRegex = /(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)(?:\s+of)?[\s:,-]+([a-zA-Z0-9#+.-]+)/gi;
  let match;
  while ((match = prefixRegex.exec(text)) !== null) {
    const yr = parseFloat(match[1]);
    const target = match[2].toLowerCase();
    if (yr && skillAliases.some(alias => target.includes(alias.toLowerCase()) || alias.toLowerCase().includes(target))) {
      claimedYears = yr;
      claimedSince = Math.round(currentYear - yr);
      break;
    }
  }

  // 2. "Python - 3 years", "Python: 3 yrs", "Python (3 years)"
  if (claimedYears === null) {
    const postfixRegex = /([a-zA-Z0-9#+.-]+)[\s:,-]+(?:\(?\s*(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\s*\)?)/gi;
    while ((match = postfixRegex.exec(text)) !== null) {
      const target = match[1].toLowerCase();
      const yr = parseFloat(match[2]);
      if (yr && skillAliases.some(alias => target.includes(alias.toLowerCase()) || alias.toLowerCase().includes(target))) {
        claimedYears = yr;
        claimedSince = Math.round(currentYear - yr);
        break;
      }
    }
  }

  // 2. Date ranges: "2021-present", "2020-2023", "since 2021"
  const rangeRegex = /(?:since\s+(\d{4})|(\d{4})\s*[-–—]\s*(present|current|now|\d{4}))/i;
  const rangeMatch = text.match(rangeRegex);
  if (rangeMatch) {
    if (rangeMatch[1]) {
      const since = parseInt(rangeMatch[1], 10);
      if (since >= 1990 && since <= currentYear) {
        claimedSince = since;
        claimedYears = currentYear - since;
      }
    } else if (rangeMatch[2]) {
      const start = parseInt(rangeMatch[2], 10);
      const endStr = rangeMatch[3].toLowerCase();
      const end = (endStr === 'present' || endStr === 'current' || endStr === 'now') ? currentYear : parseInt(endStr, 10);
      if (start >= 1990 && end >= start) {
        claimedSince = start;
        claimedYears = end - start;
      }
    }
  }

  return { claimedYears, claimedSince };
}

/**
 * Checks whether an ambiguous keyword appears in a technical context or is just a common English word.
 * Context cues:
 * - Inside a skills section (isSkillsSection === true)
 * - Near other technology keywords or punctuation like commas/bullets
 */
function isGenuineTechOccurrence(id, matchedText, wholeText, matchIndex, isSkillsSection) {
  if (isSkillsSection) return true;

  // Language "go":
  if (id === 'go') {
    // Avoid "go to", "go for", "go with", "Google", "outgoing", "let's go"
    if (matchedText !== 'Go' && matchedText !== 'Golang') return false;
    const sliceAfter = wholeText.slice(matchIndex + matchedText.length, matchIndex + matchedText.length + 15).toLowerCase();
    if (/^\s*(to|for|with|through|back|ahead|into|on|off|do|out)\b/.test(sliceAfter)) return false;
    const sliceBefore = wholeText.slice(Math.max(0, matchIndex - 15), matchIndex).toLowerCase();
    if (/\b(let's|lets|we|to|will|can|must)\s*$/.test(sliceBefore)) return false;
    return true;
  }

  // Language "r":
  if (id === 'r') {
    // Must be uppercase standalone "R" or "R language" / "R stats"
    if (matchedText !== 'R' && !/r\s+(?:programming|language|stats|project)/i.test(wholeText.slice(matchIndex, matchIndex + 25))) {
      return false;
    }
    const window = wholeText.slice(Math.max(0, matchIndex - 30), matchIndex + 30);
    return /(?:python|statistics|data|analysis|modeling|rstats|ggplot)/i.test(window);
  }

  // Language "c":
  if (id === 'c') {
    // Do not match C if it is C++ or C#
    const nextChar = wholeText.charAt(matchIndex + matchedText.length);
    if (nextChar === '+' || nextChar === '#') return false;
    if (matchedText !== 'C') return false;
    const window = wholeText.slice(Math.max(0, matchIndex - 30), matchIndex + 30);
    return /(?:embedded|linux|c\+\+|assembly|kernel|operating systems|systems programming)/i.test(window);
  }

  // Ambiguous words: express, swift, rust, spring, flask, pandas
  const techKeywords = /(?:framework|library|backend|frontend|api|microservice|database|web|devops|full[- ]stack|software|programming|code|server|cloud|architecture)/i;
  const nearbyWindow = wholeText.slice(Math.max(0, matchIndex - 60), matchIndex + matchedText.length + 60);

  if (id === 'express') {
    // Express as verb: "express interest", "express gratitude", "to express"
    if (/\b(to\s+express|express\s+(?:interest|gratitude|concerns|desire))\b/i.test(nearbyWindow)) return false;
    return /(?:node|nodejs|node\.js|javascript|rest|api|middleware|server|backend)/i.test(nearbyWindow) || techKeywords.test(nearbyWindow);
  }

  if (id === 'swift') {
    // Swift as adjective: "swift action", "swift turnaround", "swift resolution"
    if (/\b(swift\s+(?:action|turnaround|resolution|delivery|response|recovery))\b/i.test(nearbyWindow)) return false;
    return /(?:ios|apple|uikit|swiftui|xcode|macos|mobile)/i.test(nearbyWindow) || techKeywords.test(nearbyWindow);
  }

  if (id === 'rust') {
    // Rust as metal corrosion
    if (/\b(iron|metal|corrosion|oxide)\b/i.test(nearbyWindow)) return false;
    return /(?:cargo|systems|memory[- ]safe|webassembly|wasm|c\+\+|concurrency)/i.test(nearbyWindow) || techKeywords.test(nearbyWindow);
  }

  if (id === 'spring') {
    // Spring the season: "spring 2024", "in the spring"
    if (/\b(?:spring\s+\d{4}|in\s+(?:the\s+)?spring)\b/i.test(nearbyWindow)) return false;
    return /(?:boot|java|jvm|hibernate|microservice|dependency injection)/i.test(nearbyWindow) || techKeywords.test(nearbyWindow);
  }

  if (id === 'flask') {
    return /(?:python|api|web|django|fastapi|server|microframework)/i.test(nearbyWindow) || techKeywords.test(nearbyWindow);
  }

  if (id === 'pandas') {
    return /(?:python|dataframe|data|numpy|analysis|matplotlib|scikit)/i.test(nearbyWindow) || techKeywords.test(nearbyWindow);
  }

  return true;
}

/**
 * Extracts skills from text with snippets centered on match (max 140 chars).
 * Tracks section context if provided or detected.
 */
export function extractSkills(text = '', options = {}) {
  if (!text || typeof text !== 'string') return [];

  const section = options.section || 'general';
  const isSkillsSection = options.isSkillsSection || /^(?:technical[- ]skills|skills|tech[- ]stack|tools|technologies)$/i.test(section);

  const foundMap = new Map(); // id -> { id, label, category, mentions, contexts: [] }

  for (const skill of ONTOLOGY) {
    const allAliases = [skill.label, ...(skill.aliases || [])];

    for (const alias of allAliases) {
      // Escape for regex
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // For single letter words like C, R, or Go, boundary check must be precise
      let pattern;
      if (alias === 'C' || alias === 'R' || alias === 'Go') {
        pattern = new RegExp(`(?<=^|[^a-zA-Z0-9#+])(${escaped})(?=[^a-zA-Z0-9#+]|$)`, 'g');
      } else {
        pattern = new RegExp(`(?<=^|[^a-zA-Z0-9#+])(${escaped})(?=[^a-zA-Z0-9#+]|$)`, 'gi');
      }

      let match;
      while ((match = pattern.exec(text)) !== null) {
        const matchIndex = match.index;
        const matchedStr = match[1];

        // False positive check
        if (!isGenuineTechOccurrence(skill.id, matchedStr, text, matchIndex, isSkillsSection)) {
          continue;
        }

        // Center a 140-char snippet around match
        const radius = 60;
        const start = Math.max(0, matchIndex - radius);
        const end = Math.min(text.length, matchIndex + matchedStr.length + radius);
        let snippet = text.slice(start, end).replace(/\s+/g, ' ').trim();
        if (start > 0) snippet = '…' + snippet;
        if (end < text.length) snippet = snippet + '…';
        if (snippet.length > 140) snippet = snippet.slice(0, 137) + '…';

        // Check years parsing on window
        const windowForYears = text.slice(Math.max(0, matchIndex - 80), Math.min(text.length, matchIndex + matchedStr.length + 80));
        const { claimedYears, claimedSince } = parseYears(windowForYears, allAliases);

        if (!foundMap.has(skill.id)) {
          foundMap.set(skill.id, {
            id: skill.id,
            label: skill.label,
            category: skill.category,
            mentions: 0,
            claimedYears: claimedYears || null,
            claimedSince: claimedSince || null,
            contexts: []
          });
        }

        const entry = foundMap.get(skill.id);
        entry.mentions += 1;
        if (!entry.claimedYears && claimedYears) {
          entry.claimedYears = claimedYears;
          entry.claimedSince = claimedSince;
        }

        // Limit contexts to 2 snippets per skill
        if (entry.contexts.length < 2 && !entry.contexts.some(c => c.snippet === snippet)) {
          entry.contexts.push({ section, snippet });
        }
      }
    }
  }

  return Array.from(foundMap.values());
}

/**
 * Transitive implication expansion with decay.
 * e.g. nextjs -> react (0.8) -> javascript (0.8 * 0.8 = 0.64)
 */
export function expand(skillId, currentWeight = 1.0, visited = new Set()) {
  const result = [];
  if (visited.has(skillId) || currentWeight < 0.1) return result;
  visited.add(skillId);

  const skill = ONTOLOGY_MAP.get(skillId);
  if (!skill || !skill.implies) return result;

  for (const impliedId of skill.implies) {
    const decayed = Math.round(currentWeight * 0.7 * 100) / 100;
    result.push({ id: impliedId, weight: decayed });
    const sub = expand(impliedId, decayed, new Set(visited));
    result.push(...sub);
  }

  return result;
}

/**
 * Adjacency calculation (0..1) via BFS on the related graph.
 * Decay 0.6 per hop, max 2 hops.
 */
export function adjacency(skillA, skillB) {
  if (!skillA || !skillB) return 0;
  if (skillA === skillB) return 1.0;

  const queue = [{ id: skillA, weight: 1.0, hops: 0 }];
  const visited = new Set([skillA]);

  while (queue.length > 0) {
    const { id, weight, hops } = queue.shift();
    if (hops >= 2) continue;

    const skill = ONTOLOGY_MAP.get(id);
    if (!skill || !skill.related) continue;

    for (const edge of skill.related) {
      const hopWeight = weight * (edge.weight || 0.6) * 0.6;
      if (edge.id === skillB) {
        return Math.round(hopWeight * 100) / 100;
      }
      if (!visited.has(edge.id) && hops + 1 < 2) {
        visited.add(edge.id);
        queue.push({ id: edge.id, weight: hopWeight, hops: hops + 1 });
      }
    }
  }

  // Also check reverse path for symmetry if directed
  const revQueue = [{ id: skillB, weight: 1.0, hops: 0 }];
  const revVisited = new Set([skillB]);

  while (revQueue.length > 0) {
    const { id, weight, hops } = revQueue.shift();
    if (hops >= 2) continue;

    const skill = ONTOLOGY_MAP.get(id);
    if (!skill || !skill.related) continue;

    for (const edge of skill.related) {
      const hopWeight = weight * (edge.weight || 0.6) * 0.6;
      if (edge.id === skillA) {
        return Math.round(hopWeight * 100) / 100;
      }
      if (!revVisited.has(edge.id) && hops + 1 < 2) {
        revVisited.add(edge.id);
        revQueue.push({ id: edge.id, weight: hopWeight, hops: hops + 1 });
      }
    }
  }

  return 0;
}

/**
 * Autocomplete search over ontology skills
 */
export function searchOntology(query = '') {
  if (!query || typeof query !== 'string') return [];
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return ONTOLOGY.filter(s => {
    if (s.id.toLowerCase().includes(q)) return true;
    if (s.label.toLowerCase().includes(q)) return true;
    if (s.aliases && s.aliases.some(a => a.toLowerCase().includes(q))) return true;
    return false;
  }).slice(0, 15).map(s => ({
    id: s.id,
    label: s.label,
    category: s.category
  }));
}
