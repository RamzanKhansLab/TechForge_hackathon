import { z } from 'zod';
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid report ID');
export const username = z.string().trim().regex(/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i, 'Enter a GitHub username, not a URL');
export const analysisInput = z.object({ githubUsername: username });
export const jobInput = z.object({ jobDescription: z.string().trim().min(40).max(20000), title: z.string().trim().max(120).optional(), analysisId: objectId.optional() });
export const taskInput = z.object({ status: z.enum(['todo', 'in-progress', 'done']) });
export function validateId(req, res, next) { objectId.parse(req.params.id); next(); }
