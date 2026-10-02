import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, extractSkills, parseYears, expand, adjacency } from '../src/ontology/ontology.service.js';

test('normalize - case, punctuation and aliases', () => {
  assert.equal(normalize('React.js'), 'react');
  assert.equal(normalize('ReactJS'), 'react');
  assert.equal(normalize('node js'), 'nodejs');
  assert.equal(normalize('Node.js'), 'nodejs');
  assert.equal(normalize('C++'), 'cpp');
  assert.equal(normalize('cpp'), 'cpp');
  assert.equal(normalize('C#'), 'csharp');
  assert.equal(normalize('c sharp'), 'csharp');
  assert.equal(normalize('Golang'), 'go');
  assert.equal(normalize('PostgreSQL'), 'postgresql');
  assert.equal(normalize('psql'), 'postgresql');
});

test('parseYears - regex patterns for claimed years and dates', () => {
  // 3 years of Python
  const res1 = parseYears('Over 3 years of Python experience building APIs', ['python']);
  assert.equal(res1.claimedYears, 3);
  assert.ok(res1.claimedSince !== null);

  // 3+ yrs Python
  const res2 = parseYears('3+ yrs Python in backend development', ['python']);
  assert.equal(res2.claimedYears, 3);

  // Python (2021-present)
  const res3 = parseYears('Python (2021-present)', ['python']);
  assert.equal(res3.claimedSince, 2021);
  assert.ok(res3.claimedYears >= 3);

  // Python, 2020-2023
  const res4 = parseYears('Python, 2020-2023 at Acme Corp', ['python']);
  assert.equal(res4.claimedSince, 2020);
  assert.equal(res4.claimedYears, 3);

  // since 2021
  const res5 = parseYears('Working with Python since 2021', ['python']);
  assert.equal(res5.claimedSince, 2021);

  // Python - 3 years
  const res6 = parseYears('Python - 3 years experience', ['python']);
  assert.equal(res6.claimedYears, 3);

  // Absent
  const res7 = parseYears('Proficient in Python and JavaScript', ['python']);
  assert.equal(res7.claimedYears, null);
  assert.equal(res7.claimedSince, null);
});

test('False positive guards - Go vs Google/verbs, R inside words, C vs C++/C#, Java vs JS', () => {
  // Go vs Google / verb
  const text1 = 'We use Google Cloud and go to conferences with colleagues.';
  const extracted1 = extractSkills(text1, { section: 'experience' });
  const ids1 = extracted1.map(s => s.id);
  assert.ok(!ids1.includes('go'), 'Should not extract "go" from "Google" or "go to"');
  assert.ok(ids1.includes('gcp'), 'Should extract Google Cloud as gcp');

  const textGo = 'Built high-throughput microservices using Go and Docker.';
  const extractedGo = extractSkills(textGo, { section: 'experience' });
  assert.ok(extractedGo.some(s => s.id === 'go'), 'Should extract Go in programming context');

  // R inside words
  const textR = 'Regular expressions for string processing and architecture.';
  const extractedR = extractSkills(textR, { section: 'experience' });
  assert.ok(!extractedR.some(s => s.id === 'r'), 'Should not extract R from normal words');

  // C vs C++ vs C#
  const textC = 'Developed in C++ and C# for desktop applications.';
  const extractedC = extractSkills(textC, { section: 'experience' });
  const cIds = extractedC.map(s => s.id);
  assert.ok(cIds.includes('cpp'));
  assert.ok(cIds.includes('csharp'));
  assert.ok(!cIds.includes('c'), 'Should not falsely match standalone C when C++ or C# are used');

  // Java vs JavaScript
  const textJava = 'Built backend microservices with Java and Spring Boot.';
  const extractedJava = extractSkills(textJava, { section: 'experience' });
  const javaIds = extractedJava.map(s => s.id);
  assert.ok(javaIds.includes('java'));
  assert.ok(!javaIds.includes('javascript'), 'Java text should not trigger JavaScript');

  // Ambiguous words: Express, Swift, Rust, Spring in prose
  const prose1 = 'I want to express my enthusiasm for this swift turnaround in the spring season.';
  const extractedProse = extractSkills(prose1, { section: 'summary' });
  const proseIds = extractedProse.map(s => s.id);
  assert.ok(!proseIds.includes('express'), 'Should not match verb "express"');
  assert.ok(!proseIds.includes('swift'), 'Should not match adjective "swift"');
  assert.ok(!proseIds.includes('spring'), 'Should not match season "spring"');

  const tech1 = 'Backend stack: Node.js, Express, MongoDB, and Redis.';
  const extractedTech = extractSkills(tech1, { section: 'skills', isSkillsSection: true });
  const techIds = extractedTech.map(s => s.id);
  assert.ok(techIds.includes('express'), 'Should match Express in tech context');
  assert.ok(techIds.includes('nodejs'));
  assert.ok(techIds.includes('mongodb'));
});

test('expand - transitive implications with decay', () => {
  const nextExp = expand('nextjs');
  const ids = nextExp.map(e => e.id);
  assert.ok(ids.includes('react'));
  assert.ok(ids.includes('javascript'));

  const reactItem = nextExp.find(e => e.id === 'react');
  const jsItem = nextExp.find(e => e.id === 'javascript');
  assert.ok(reactItem.weight > jsItem.weight, 'Direct implication should have higher weight than transitive');
});

test('adjacency - BFS graph distance with decay', () => {
  const scoreSame = adjacency('react', 'react');
  assert.equal(scoreSame, 1.0);

  const scoreNear = adjacency('react', 'nextjs');
  assert.ok(scoreNear > 0.3, 'React and Next.js should have high adjacency');

  const scoreUnrelated = adjacency('react', 'cassandra');
  assert.equal(scoreUnrelated, 0, 'Unrelated skills should have 0 adjacency within 2 hops');
});
