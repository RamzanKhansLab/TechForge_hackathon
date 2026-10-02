import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8000),
  MONGO_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  GITHUB_TOKEN: z.string().default(''),
  GITHUB_API_VERSION: z.string().default('2022-11-28'),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  MAX_REPOSITORIES: z.coerce.number().int().min(1).max(12).default(6),
  MAX_FILE_SIZE_MB: z.coerce.number().int().min(1).max(10).default(5),
  GITHUB_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).max(3600).default(900),
  TRUST_PROXY: z.coerce.number().int().min(0).max(2).default(0),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.issues.map(i => i.path.join('.')).join(', ')}. See backend/.env.example.`);
}
export const env = Object.freeze(parsed.data);
export const clientOrigins = env.CLIENT_ORIGIN.split(',').map(origin => {
  const url = new URL(origin.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin.trim()) throw new Error('CLIENT_ORIGIN must contain exact HTTP(S) origins without trailing slashes.');
  return url.origin;
});
