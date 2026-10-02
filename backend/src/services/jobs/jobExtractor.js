import { extractSkills, categorizeSkills } from '../resume/skillExtractor.js';

export function extractJobSkills(description = '') {
  const required = new Set(); const preferred = new Set(); let preferredSection = false;
  for (const line of description.split(/\n|(?<=[.!?])\s+/)) {
    if (/^\s*(?:preferred|nice[- ]to[- ]have|bonus|desirable|optional)(?:\s+(?:skills|qualifications|requirements))?\s*:?\s*$/i.test(line)) preferredSection = true;
    if (/^\s*(?:required|requirements|must[- ]have|essential|responsibilities)(?:\s+(?:skills|qualifications))?\s*:?\s*$/i.test(line)) preferredSection = false;
    // Clause splitting prevents a "nice to have" at the end from downgrading an entire sentence.
    for (const clause of line.split(/;|\bbut\b|\bwhile\b/i)) {
      const negated = /(?:not required|no (?:prior )?(?:experience|knowledge)(?: (?:in|with))? required|not necessary)/i.test(clause);
      const optional = preferredSection || /preferred|nice[- ]to[- ]have|bonus|desirable|optional|a plus/i.test(clause) || negated;
      for (const skill of extractSkills(clause, { section: optional ? 'preferred' : 'required' })) {
        (optional ? preferred : required).add(skill);
      }
    }
  }
  for (const skill of required) preferred.delete(skill);
  return { requiredSkills: [...required], preferredSkills: [...preferred], categories: categorizeSkills([...new Set([...required,...preferred])]) };
}
