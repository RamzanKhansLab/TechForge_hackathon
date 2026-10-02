import { SKILLS, LANGUAGE_MAP, CONFIG_RULES } from '../../data/skills.js';
import { extractSkills } from '../resume/skillExtractor.js';

export function collectRepositoryEvidence(repo, languages, paths, files, commits) {
  const evidence = []; const signalCounts = new Map();
  const urlFor = file => `${repo.html_url}/blob/${encodeURIComponent(repo.default_branch)}/${file.split('/').map(encodeURIComponent).join('/')}`;
  const add = (skill, type, file, description, strength = 'direct', url = urlFor(file)) => {
    const key = `${skill}:${type}`; const count = signalCounts.get(key) || 0;
    // Keep large configuration-heavy trees below MongoDB document and free-tier memory limits.
    if (count >= 20) return;
    signalCounts.set(key,count+1);
    evidence.push({ skill, type, repository: repo.name, file, description, strength, url, date: repo.pushed_at });
  };
  for (const [language, bytes] of Object.entries(languages)) if (LANGUAGE_MAP[language] && bytes >= 100) add(LANGUAGE_MAP[language], 'language', '', `${bytes.toLocaleString()} bytes of ${language} reported by GitHub Linguist.`, 'direct', `https://api.github.com/repos/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}/languages`);
  for (const path of paths) {
    for (const rule of CONFIG_RULES) if (rule.pattern.test(path)) add(rule.skill, 'configuration', path, `${path} is present. Configuration presence does not prove execution.`);
  }
  for (const { path, text } of files) {
    if (/package\.json$/.test(path)) {
      let manifest; try { manifest = JSON.parse(text); } catch { continue; }
      const packages = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies, ...manifest.peerDependencies });
      for (const skill of SKILLS) if (skill.packages.some(name => packages.includes(name))) add(skill.id, 'dependency', path, `${skill.name} is declared in ${path}. A declaration does not confirm runtime use.`);
      if (packages.some(name => name.startsWith('@aws-sdk/'))) add('aws', 'dependency', path, 'AWS SDK package declared.');
      if (manifest.engines?.node || Object.values(manifest.scripts || {}).some(script => /\bnode\s/.test(script)) || packages.some(p => ['express','@nestjs/core','koa','fastify'].includes(p))) add('nodejs', 'configuration', path, 'Node.js runtime or server framework is configured.');
      const testScript = manifest.scripts?.test;
      if (testScript && !/no test specified|exit 1/.test(testScript)) add('testing', 'configuration', path, `Test script declared: ${String(testScript).slice(0,160)}. Test execution was not verified.`);
    } else if (/(?:requirements[^/]*\.txt|pyproject\.toml|pom\.xml|build\.gradle|Gemfile|Cargo\.toml|go\.mod)$/.test(path)) {
      for (const skill of SKILLS) {
        const found = skill.packages.some(name => {
          const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          return new RegExp(`(?:^|[\\s"'>,])${escaped}(?=[\\s"'<>=!~\\[;,]|$)`, 'im').test(text);
        });
        if (found) add(skill.id, 'dependency', path, `${skill.name} dependency found in ${path}.`);
      }
    }
    if (/\.ya?ml$/.test(path) && /apiVersion:\s*(apps\/v1|v1)/.test(text) && /kind:\s*(Deployment|Service|Pod|StatefulSet)/.test(text)) add('kubernetes', 'configuration', path, 'Kubernetes resource manifest detected; deployment not verified.');
    if (/readme/i.test(path)) for (const skill of extractSkills(text)) add(skill, 'readme', path, 'Technology mentioned in README documentation.', 'supporting');
  }
  const testPaths = paths.filter(path => /(^|\/)(tests?|__tests__)\/|\.(?:test|spec)\.[cm]?[jt]sx?$|(^|\/)test_[^/]+\.py$/.test(path));
  if (testPaths.length) add('testing', 'configuration', testPaths[0], `${testPaths.length} test-path indicators found; test quality and execution are unverified.`);
  const deploymentPaths = paths.filter(path => /(^|\/)(vercel\.json|render\.ya?ml|netlify\.toml|fly\.toml|Procfile)$/.test(path));
  const platforms = deploymentPaths.map(path => /vercel/.test(path) ? 'Vercel' : /render/.test(path) ? 'Render' : /netlify/.test(path) ? 'Netlify' : /fly/.test(path) ? 'Fly.io' : 'Procfile');
  const readmeFile = files.find(file => /readme/i.test(file.path));
  const readmeText = readmeFile?.text || '';
  const deploymentLinks = [...new Set(readmeText.match(/https:\/\/[a-z\d.-]+\.(?:vercel\.app|netlify\.app|onrender\.com|github\.io)(?:\/[^\s)\]<>]*)?/gi) || [])].slice(0, 10);
  const directSkills = [...new Set(evidence.filter(e => e.strength === 'direct').map(e => e.skill))];
  for (const skill of directSkills) {
    if (commits.length) add(skill, 'commitActivity', '', `${commits.length} sampled commits attributed to this GitHub user in this repository; not attributed to a specific skill.`, 'supporting', commits[0].url);
    if (commits.some(commit => new Date(commit.date) >= new Date(Date.now() - 90 * 86400000))) add(skill, 'recentActivity', '', 'Candidate-authored repository activity within 90 days; not skill-specific.', 'supporting', commits[0].url);
    if (testPaths.length) add(skill, 'testing', testPaths[0], 'This repository contains test-path indicators; execution is unverified.', 'supporting');
    if (deploymentPaths.length) add(skill, 'deployment', deploymentPaths[0], 'Deployment configuration exists in this repository; a live deployment is unverified.', 'supporting');
  }
  return {
    evidence, testingDetected: testPaths.length > 0 || evidence.some(e => e.strength === 'direct' && SKILLS.find(s => s.id === e.skill)?.category === 'Testing'),
    testingFramework: SKILLS.filter(s => s.category === 'Testing' && s.id !== 'testing' && evidence.some(e => e.skill === s.id && e.type === 'dependency')).map(s => s.name),
    testEvidence: testPaths.slice(0,15), deploymentDetected: deploymentPaths.length > 0 || deploymentLinks.length > 0,
    deploymentPlatform: [...new Set(platforms)], deploymentEvidence: [...deploymentPaths, ...deploymentLinks].slice(0,20),
    readme: { description: readmeText.replace(/[#*`]/g, '').trim().slice(0,500), setupInstructions: /install|getting started|setup|npm (?:i|install)|pip install/i.test(readmeText), deploymentLinks },
  };
}
