/**
 * services/coach/roadmap.service.js
 * Pure functions for roadmap + weekly packing.
 * No DB calls.  All exported functions are unit-tested.
 */
import { ONTOLOGY_MAP, adjacency } from '../../ontology/ontology.service.js';
import { skillEffortHours } from './readiness.service.js';
import { microTaskFor } from '../../data/microTasks.js';

const EFFORT_TAG = h => h <= 2 ? 'S' : h <= 5 ? 'M' : 'L';

/**
 * Produce the full roadmap for a candidate.
 *
 * @param {object} analysis      – completed Analysis doc (plain object OK)
 * @param {Array}  savedRoles    – array of JobAnalysis docs for target roles
 * @param {number} hoursPerWeek  – editable, default 6
 * @param {string|null} roleId   – if set, only use gaps from that role; else union all
 * @returns {object}  { items[], weeks[], totalHours, projectedUpgrades }
 */
export function buildRoadmap(analysis, savedRoles = [], hoursPerWeek = 6, roleId = null) {
  const skills = analysis.skills ?? [];
  const provenIds = skills.filter(s => s.verdict === 'Proven').map(s => s.id);
  const claimedIds = new Set(skills.filter(s => s.claimed).map(s => s.id));
  const skillById = new Map(skills.map(s => [s.id, s]));

  // ── 1. Collect gap skill IDs ─────────────────────────────────────────────
  const relevantRoles = roleId
    ? savedRoles.filter(r => String(r._id) === roleId)
    : savedRoles;

  // Gaps from target roles (skills not Proven), weighted by importance
  const roleGapWeight = new Map(); // skillId -> { importance, jdSnippet, roleTitle }
  for (const role of relevantRoles) {
    for (const m of role.matches ?? []) {
      if (m.state === 'Gap' || m.state === 'Partial') {
        const prev = roleGapWeight.get(m.skill) ?? { importance: 0, jdSnippet: null, roleTitle: null };
        roleGapWeight.set(m.skill, {
          importance: prev.importance + ((role.requiredSkills ?? []).includes(m.skill) ? 1.0 : 0.5),
          jdSnippet: prev.jdSnippet ?? m.reason ?? null,
          roleTitle: prev.roleTitle ?? (role.title ?? null),
        });
      }
    }
    // Also add required skills that are Claimed-only even if not in matches
    for (const id of role.requiredSkills ?? []) {
      if (!roleGapWeight.has(id)) {
        const s = skillById.get(id);
        if (!s || s.verdict !== 'Proven') {
          roleGapWeight.set(id, { importance: 1.0, jdSnippet: null, roleTitle: role.title ?? null });
        }
      }
    }
  }

  // Also include claimed-only / partial skills even if no saved role
  for (const s of skills) {
    if (s.claimed && s.verdict !== 'Proven' && !roleGapWeight.has(s.id)) {
      roleGapWeight.set(s.id, { importance: 0.1, jdSnippet: null, roleTitle: null });
    }
  }

  if (roleGapWeight.size === 0) {
    return { items: [], weeks: [], totalHours: 0, projectedUpgrades: 0 };
  }

  // ── 2. Build item list ───────────────────────────────────────────────────
  const rawItems = [];
  for (const [skillId, meta] of roleGapWeight) {
    const ont = ONTOLOGY_MAP.get(skillId);
    if (!ont) continue;

    const hours = skillEffortHours(skillId, provenIds);
    const effort = { tag: EFFORT_TAG(hours), hours };

    // Prerequisites: ontology implies[] filtered to only those not yet Proven by candidate
    const prereqs = (ont.implies ?? []).filter(depId => !provenIds.includes(depId));

    // whyNow sentence
    const whyNow = buildWhyNow(skillId, meta, skills);

    rawItems.push({
      skillId,
      label: ont.label,
      importance: meta.importance,
      effort,
      whyNow,
      prerequisites: prereqs,
      taskId: skillId, // microTask IDs match skill IDs
      _priority: 0, // filled after topo sort
    });
  }

  // ── 3. Topological sort by prerequisites, then importance desc ───────────
  const sorted = topoSort(rawItems);
  sorted.forEach((item, i) => { item._priority = i + 1; });

  // ── 4. Weekly packing ────────────────────────────────────────────────────
  const { weeks, totalHours } = packWeeks(sorted, hoursPerWeek);

  // projectedUpgrades: skills that would become Partial or Proven IF criteria are met
  // (conservative: partial → count all gap skills; proven needs code evidence – skip,
  //  so we count only skills currently Partial that could reach Proven)
  const projectedUpgrades = skills.filter(s =>
    roleGapWeight.has(s.id) && s.verdict === 'Partial'
  ).length + Math.floor(roleGapWeight.size * 0.5); // rough: assume ~50% of new items → Partial

  return {
    items: sorted.map(({ _priority, ...rest }) => ({ ...rest, priority: _priority })),
    weeks,
    totalHours,
    projectedUpgrades,
  };
}

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Deterministic topological sort using Kahn's algorithm.
 * Items with unresolved prerequisites are moved after their dependencies.
 * Within the same "level" items are ordered by importance desc, then skillId asc.
 */
export function topoSort(items) {
  const idToItem = new Map(items.map(i => [i.skillId, i]));
  // Only consider prereqs that are also in the gap list (i.e., we need to do them too)
  const gapIds = new Set(items.map(i => i.skillId));
  const inDegree = new Map(items.map(i => [i.skillId, 0]));
  const outEdges = new Map(items.map(i => [i.skillId, []]));

  for (const item of items) {
    for (const prereq of item.prerequisites) {
      if (gapIds.has(prereq)) {
        inDegree.set(item.skillId, (inDegree.get(item.skillId) ?? 0) + 1);
        outEdges.get(prereq).push(item.skillId);
      }
    }
  }

  // Initial queue: zero in-degree, sorted by importance desc, skillId asc
  let queue = items
    .filter(i => inDegree.get(i.skillId) === 0)
    .sort(byImportance);

  const result = [];
  while (queue.length > 0) {
    const next = queue.shift();
    result.push(next);
    const newReady = [];
    for (const depId of outEdges.get(next.skillId) ?? []) {
      const deg = (inDegree.get(depId) ?? 1) - 1;
      inDegree.set(depId, deg);
      if (deg === 0) newReady.push(idToItem.get(depId));
    }
    newReady.sort(byImportance);
    queue = [...newReady, ...queue].sort(byImportance);
  }

  // Append any remaining (cyclic or missing prereqs) sorted by importance
  const seen = new Set(result.map(i => i.skillId));
  const tail = items.filter(i => !seen.has(i.skillId)).sort(byImportance);
  return [...result, ...tail];
}

function byImportance(a, b) {
  return b.importance - a.importance || a.skillId.localeCompare(b.skillId);
}

/**
 * Greedy weekly packing.
 * Tasks may split across weeks only when hours > hoursPerWeek.
 * Tasks within a week are consumed in sorted order.
 */
export function packWeeks(items, hoursPerWeek) {
  if (hoursPerWeek <= 0 || items.length === 0) return { weeks: [], totalHours: 0 };

  const totalHours = items.reduce((s, i) => s + i.effort.hours, 0);
  const weeks = [];
  let weekIndex = 1;
  let remaining = [...items].map(i => ({ skillId: i.skillId, hoursLeft: i.effort.hours }));

  while (remaining.length > 0) {
    let budget = hoursPerWeek;
    const weekItems = [];

    const nextRemaining = [];
    for (const task of remaining) {
      if (budget <= 0) { nextRemaining.push(task); continue; }
      const take = Math.min(task.hoursLeft, budget);
      weekItems.push({ skillId: task.skillId, hours: take, continued: task.hoursLeft < items.find(i => i.skillId === task.skillId)?.effort.hours });
      budget -= take;
      const left = task.hoursLeft - take;
      if (left > 0) nextRemaining.push({ skillId: task.skillId, hoursLeft: left });
    }

    if (weekItems.length > 0) {
      weeks.push({
        index: weekIndex++,
        hours: weekItems.reduce((s, t) => s + t.hours, 0),
        items: weekItems,
      });
    }
    remaining = nextRemaining;
    if (remaining.length > 0 && weekItems.length === 0) break; // safety: infinite loop guard
  }

  return { weeks, totalHours };
}

function buildWhyNow(skillId, meta, allSkills) {
  if (meta.jdSnippet) {
    const roleRef = meta.roleTitle ? ` for "${meta.roleTitle}"` : '';
    return `Required${roleRef}. JD context: "${meta.jdSnippet.slice(0, 100)}"`;
  }
  const s = allSkills.find(x => x.id === skillId);
  if (s?.claimed?.contexts?.length) {
    return `Claimed on your resume: "${s.claimed.contexts[0].snippet?.slice(0, 100) ?? ''}"`;
  }
  return `Not yet proven in your public repositories.`;
}
