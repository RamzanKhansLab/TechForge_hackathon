import test from 'node:test';
import assert from 'node:assert/strict';
import { parseResume } from '../src/services/resume/resume.service.js';

function createMinimalPdf(textContent) {
  const lines = textContent.split('\n');
  const stream = ['BT', '/F1 12 Tf', '100 700 Td', ...lines.map(line => `(${line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')}) '`), 'ET'].join('\n');
  const streamLength = Buffer.byteLength(stream);

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${stream}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000300 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
380
%%EOF`;
  return Buffer.from(pdf);
}

test('Acceptance test: two different resumes produce different extracted sets matching their PDF content', async () => {
  // Resume 1: Python Data Engineer
  const resume1Text = `Alex Chen
alex.chen@example.com

Technical Skills
Python (4 years), PostgreSQL, Pandas, NumPy, Docker, AWS

Experience
Senior Data Engineer
Built ETL data pipelines using Python and Docker on AWS cloud infrastructure.`;
  const pdf1 = createMinimalPdf(resume1Text);
  const result1 = await parseResume(pdf1);

  // Resume 2: Frontend / Fullstack Engineer
  const resume2Text = `Sarah Connor
sarah.connor@example.com

Technical Skills
React (3 years), TypeScript, Next.js, Tailwind CSS, GraphQL

Experience
Frontend Engineer
Engineered modern user interfaces using React, Next.js and TypeScript.`;
  const pdf2 = createMinimalPdf(resume2Text);
  const result2 = await parseResume(pdf2);

  // Assertions: Result 1
  assert.equal(result1.candidate.name, 'Alex Chen');
  assert.equal(result1.candidate.email, 'alex.chen@example.com');
  const skills1 = result1.resume.skills;
  assert.ok(skills1.includes('python'), 'Resume 1 should include python');
  assert.ok(skills1.includes('postgresql'), 'Resume 1 should include postgresql');
  assert.ok(skills1.includes('pandas'), 'Resume 1 should include pandas');
  assert.ok(skills1.includes('docker'), 'Resume 1 should include docker');
  assert.ok(!skills1.includes('react'), 'Resume 1 should not include react');

  const pythonDetail = result1.resume.detailedSkills.find(s => s.id === 'python');
  assert.ok(pythonDetail, 'Detailed python skill should exist');
  assert.equal(pythonDetail.claimedYears, 4);

  // Assertions: Result 2
  assert.equal(result2.candidate.name, 'Sarah Connor');
  assert.equal(result2.candidate.email, 'sarah.connor@example.com');
  const skills2 = result2.resume.skills;
  assert.ok(skills2.includes('react'), 'Resume 2 should include react');
  assert.ok(skills2.includes('typescript'), 'Resume 2 should include typescript');
  assert.ok(skills2.includes('nextjs'), 'Resume 2 should include nextjs');
  assert.ok(skills2.includes('tailwind'), 'Resume 2 should include tailwind');
  assert.ok(!skills2.includes('python'), 'Resume 2 should not include python');

  const reactDetail = result2.resume.detailedSkills.find(s => s.id === 'react');
  assert.ok(reactDetail, 'Detailed react skill should exist');
  assert.equal(reactDetail.claimedYears, 3);

  // Disjoint sets check
  const common = skills1.filter(s => skills2.includes(s));
  assert.equal(common.length, 0, 'Two distinct profiles must have distinct skill outputs');
});
