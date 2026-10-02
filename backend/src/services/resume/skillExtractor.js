import { extractSkills as ontologyExtract, ONTOLOGY_MAP } from '../../ontology/ontology.service.js';

export function extractSkills(text = '', options = {}) {
  // Support both legacy signature (returns string IDs or rich objects) and new signature
  const results = ontologyExtract(text, options);
  return results.map(r => r.id);
}

export function extractDetailedSkills(text = '', options = {}) {
  return ontologyExtract(text, options);
}

export function categorizeSkills(ids) {
  return ids.reduce((groups, id) => {
    const skill = ONTOLOGY_MAP.get(id);
    if (skill) {
      (groups[skill.category] ||= []).push(id);
    }
    return groups;
  }, {});
}
