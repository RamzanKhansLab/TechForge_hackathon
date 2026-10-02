import { SKILLS, SKILL_MAP } from '../../data/skills.js';
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = SKILLS.map(skill => ({ id: skill.id, pattern: new RegExp(`(?:^|[^a-z0-9])(?:${skill.aliases.map(escape).join('|')})(?=$|[^a-z0-9])`, 'i') }));
export function extractSkills(text = '') {
  const ids = patterns.filter(({ pattern }) => pattern.test(text)).map(({ id }) => id);
  // "go" is an ordinary English verb; only accept the standalone language name with its canonical casing.
  if (/(?:^|[,|;\s])Go(?=$|[,|;\s])/.test(text) && !ids.includes('go')) ids.push('go');
  return ids;
}
export function categorizeSkills(ids) {
  return ids.reduce((groups, id) => { const skill = SKILL_MAP[id]; if (skill) (groups[skill.category] ||= []).push(id); return groups; }, {});
}
