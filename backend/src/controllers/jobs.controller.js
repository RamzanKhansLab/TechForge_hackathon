import { jobInput, taskInput } from '../middlewares/validation.js';
import * as service from '../services/jobs/jobs.service.js';
import { publicDocument } from '../utils/access.js';
const ownerId = req => req.user._id;
export async function create(req,res) { res.status(201).json({ success: true, data: await service.analyzeJob(jobInput.parse(req.body),ownerId(req)) }); }
export async function read(req,res) { res.json({ success: true, data: publicDocument(await service.getJob(req.params.id,ownerId(req))) }); }
export async function match(req,res) {
  const job = await service.getJob(req.params.id,ownerId(req));
  res.json({ success: true, data: { analysisId: job.analysisId, coverage: job.coverage, summary: job.summary, matches: job.matches, microTasks: job.microTasks } });
}
export async function task(req,res) { const { status } = taskInput.parse(req.body); res.json({ success: true, data: await service.updateTask(req.params.id,req.params.skill,status,ownerId(req)) }); }
