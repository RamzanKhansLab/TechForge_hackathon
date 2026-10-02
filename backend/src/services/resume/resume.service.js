import { PDFParse } from 'pdf-parse';
import { extractSkills, extractDetailedSkills, categorizeSkills } from './skillExtractor.js';
import { AppError } from '../../utils/AppError.js';

const skillsHeadingRegex = /^(?:technical\s+skills|skills|tech\s+stack|tools|technologies)$/i;
const sectionNames = {
  skills: skillsHeadingRegex,
  projects: /^(?:personal\s+|academic\s+)?projects?$/i,
  experience: /^(?:(?:work|professional|employment)\s+)?(?:experience|history)$/i,
  education: /^(?:education|academic\s+background|qualifications)$/i,
  certifications: /^(?:certifications?|licenses?(?:\s+and\s+certifications)?)$/i,
};

function sections(lines) {
  const result = { skills: [], projects: [], experience: [], education: [], certifications: [] };
  let current = null;
  for (const line of lines) {
    const heading = line.replace(/[:\s]+$/, '');
    const match = Object.entries(sectionNames).find(([, regex]) => regex.test(heading));
    if (match) { current = match[0]; continue; }
    if (/^(?:summary|profile|interests|languages|awards|contact)$/i.test(heading)) { current = null; continue; }
    if (current && result[current].length < 30) result[current].push(line.slice(0, 500));
  }
  return result;
}

export async function parseResume(buffer) {
  if (buffer.subarray(0, 5).toString() !== '%PDF-') throw new AppError(400, 'INVALID_PDF', 'This file does not have a valid PDF signature.');
  let parser;
  try {
    parser = new PDFParse({ data: new Uint8Array(buffer), isEvalSupported: false });
    const info = await parser.getInfo();
    if (info.total > 15) throw new AppError(422, 'TOO_MANY_PAGES', 'Please use a resume of 15 pages or fewer.');
    const parsed = await parser.getText();
    const text = parsed.text.slice(0, 100000);
    if (text.replace(/\s/g, '').length < 40) throw new AppError(422, 'RESUME_TEXT_UNAVAILABLE', 'No readable resume text was found. Upload a text-based PDF; scanned documents need OCR first.');
    const lines = text.split(/(?:\r?\n|\t)+/).map(line => line.trim()).filter(Boolean);
    const parsedSections = sections(lines);

    // Extract rich skills across sections with section awareness
    const allDetailed = [];
    const seenMap = new Map();

    // 1. First process explicit skills section with highest weight
    if (parsedSections.skills.length > 0) {
      const skillsText = parsedSections.skills.join('\n');
      const fromSkills = extractDetailedSkills(skillsText, { section: 'skills', isSkillsSection: true });
      for (const item of fromSkills) seenMap.set(item.id, item);
    }

    // 2. Process experience, projects, and entire document
    const fullDocDetailed = extractDetailedSkills(text, { section: 'general' });
    for (const item of fullDocDetailed) {
      if (!seenMap.has(item.id)) {
        seenMap.set(item.id, item);
      } else {
        const existing = seenMap.get(item.id);
        existing.mentions += item.mentions;
        for (const ctx of item.contexts) {
          if (existing.contexts.length < 2 && !existing.contexts.some(c => c.snippet === ctx.snippet)) {
            existing.contexts.push(ctx);
          }
        }
        if (!existing.claimedYears && item.claimedYears) {
          existing.claimedYears = item.claimedYears;
          existing.claimedSince = item.claimedSince;
        }
      }
    }

    const richSkills = Array.from(seenMap.values());
    const skillIds = richSkills.map(s => s.id);

    const name = lines.slice(0, 10).find(line => /^[\p{L}][\p{L} .'-]{2,69}$/u.test(line) && !/resume|curriculum|developer|engineer|profile|summary|skills|technical/i.test(line));
    const email = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0];
    const phone = text.match(/(?:\+\d{1,3}[ .-]?)?(?:\(?\d{3}\)?[ .-]?)\d{3}[ .-]?\d{4}\b/)?.[0];

    const { skills: _rawSkillsSection, ...restSections } = parsedSections;

    return {
      candidate: { name, email, phone },
      resume: {
        pages: info.total,
        skills: skillIds,
        detailedSkills: richSkills,
        categories: categorizeSkills(skillIds),
        ...restSections
      },
      warnings: skillIds.length ? [] : ['No dictionary skills were found in the resume. GitHub-discovered skills will still be analyzed.']
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(422, 'PDF_PARSE_FAILED', 'The PDF could not be read. Use an unencrypted, text-based PDF.');
  } finally { if (parser) await parser.destroy().catch(() => {}); }
}
