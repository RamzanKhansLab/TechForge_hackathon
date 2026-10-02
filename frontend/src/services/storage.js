const STORAGE_KEY = 'skillproof.reports.v1';
let memory;
export function readReports() {
  if (memory) return memory;
  try { const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); memory = Array.isArray(parsed) ? parsed.filter(r => /^[a-f\d]{24}$/i.test(r.id) && /^[a-f\d]{64}$/.test(r.token) && ['analysis','job'].includes(r.type)) : []; }
  catch { memory = []; }
  return memory;
}
export function writeReports(reports) { memory = reports; try { localStorage.setItem(STORAGE_KEY,JSON.stringify(reports)); return true; } catch { return false; } }
export function getToken(type,id) { return readReports().find(report => report.type === type && report.id === id)?.token; }
