/**
 * services/recruiter/verify.service.js
 *
 * Deterministic generator for "how to verify this yourself" instructions.
 * Pure function: takes an evidence object and returns a clear, step-by-step
 * human-readable verification guide without any LLM or external calls.
 */

/**
 * Returns a deterministic plain text instruction explaining how a reviewer / recruiter
 * can independently verify an evidence artifact on GitHub.
 *
 * @param {object} evidence - An evidence item with { kind, type, repo, repository, path, file, url, note, meta }
 * @returns {string} - Human-readable verification instruction
 */
export function verifyInstruction(evidence = {}) {
  const repo = evidence.repo || evidence.repository || 'the repository';
  const filePath = evidence.path || evidence.file || '';
  const kind = (evidence.kind || evidence.type || '').toLowerCase();
  const url = evidence.url || '';

  if (kind === 'manifest' || filePath.endsWith('package.json') || filePath.endsWith('Cargo.toml') || filePath.endsWith('go.mod') || filePath.endsWith('pom.xml') || filePath.endsWith('requirements.txt')) {
    return `Open ${repo} on GitHub, navigate to '${filePath || 'dependency manifest'}', and verify that this package or library is declared in dependencies. Direct link: ${url || 'in repository root'}.`;
  }

  if (kind === 'dockerfile' || filePath.toLowerCase().includes('dockerfile')) {
    return `Open ${repo}, view '${filePath || 'Dockerfile'}', and check the base image, build stages, and entrypoint configuration. Direct link: ${url}.`;
  }

  if (kind === 'ci_workflow' || filePath.includes('.github/workflows')) {
    return `Inspect workflow definition at '${filePath}' in ${repo}. Confirm build, test, or deployment job steps run automatically. Direct link: ${url}.`;
  }

  if (kind === 'test_suite' || /test|spec|__tests__/.test(filePath)) {
    return `Open test file '${filePath}' in ${repo}. Review test cases and assertions to confirm active automated testing. Direct link: ${url}.`;
  }

  if (kind === 'commit' || evidence.meta?.commitSha) {
    const sha = evidence.meta?.commitSha ? evidence.meta.commitSha.slice(0, 7) : 'commit';
    return `Inspect commit ${sha} on ${repo} on GitHub. Check the diff and author email to confirm authorship and implementation. Direct link: ${url}.`;
  }

  if (kind === 'code_symbol' || (filePath && (filePath.endsWith('.js') || filePath.endsWith('.ts') || filePath.endsWith('.py') || filePath.endsWith('.go') || filePath.endsWith('.rs')))) {
    return `Inspect source file '${filePath}' in ${repo} on GitHub. Verify imports, usage, and logic implementation for this skill. Direct link: ${url}.`;
  }

  if (url) {
    return `Open the public GitHub artifact at ${url} and inspect the file or commit for direct evidence of this skill.`;
  }

  return `Visit the public GitHub repository ${repo} and inspect source files and commit history for this skill.`;
}
