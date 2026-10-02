import { PDFParse } from 'pdf-parse';
import { extractSkills, categorizeSkills } from './skillExtractor.js';
import { AppError } from '../../utils/AppError.js';

const sectionNames = { projects: /^(?:personal |academic )?projects?$/i, experience: /^(?:(?:work|professional|employment) )?(?:experience|history)$/i, education: /^(?:education|academic background|qualifications)$/i, certifications: /^(?:certifications?|licenses?(?: and certifications)?)$/i };
function sections(lines) {
  const result = { projects: [], experience: [], education: [], certifications: [] };
  let current = null;
  for (const line of lines) {
    const heading = line.replace(/[:\s]+$/, '');
    const match = Object.entries(sectionNames).find(([, regex]) => regex.test(heading));
    if (match) { current = match[0]; continue; }
    if (/^(?:technical skills|skills|summary|profile|interests|languages|awards|contact)$/i.test(heading)) { current = null; continue; }
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
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const skills = extractSkills(text);
    const name = lines.slice(0, 8).find(line => /^[\p{L}][\p{L} .'-]{2,69}$/u.test(line) && !/resume|curriculum|developer|engineer|profile|summary|skills/i.test(line));
    const email = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0];
    const phone = text.match(/(?:\+\d{1,3}[ .-]?)?(?:\(?\d{3}\)?[ .-]?)\d{3}[ .-]?\d{4}\b/)?.[0];
    return { candidate: { name, email, phone }, resume: { pages: info.total, skills, categories: categorizeSkills(skills), ...sections(lines) }, warnings: skills.length ? [] : ['No dictionary skills were found in the resume. GitHub-discovered skills will still be analyzed.'] };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(422, 'PDF_PARSE_FAILED', 'The PDF could not be read. Use an unencrypted, text-based PDF.');
  } finally { if (parser) await parser.destroy().catch(() => {}); }
}
