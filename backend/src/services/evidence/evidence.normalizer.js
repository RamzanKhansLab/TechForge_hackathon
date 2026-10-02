export function normalizeEvidence(repositories) {
  const seen = new Set();
  return repositories.flatMap(repo => repo.evidence).filter(item => {
    const key = [item.skill,item.type,item.repository,item.file].join(':');
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}
