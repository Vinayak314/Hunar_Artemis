import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Load server/.env when present (local dev). In production the host injects real env vars.
const envFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z
    .string()
    .regex(/^mongodb(\+srv)?:\/\//, 'MONGODB_URI must be a mongodb:// or mongodb+srv:// URI'),
  // Optional override; by default the database named in MONGODB_URI is used.
  MONGODB_DB: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().min(1).default('gemini-3.5-flash'),
  // Used when the main model is overloaded (503/429), so a busy moment does not stop customers.
  GEMINI_FALLBACK_MODEL: z.string().min(1).default('gemini-3.5-flash-lite'),
  // Comma-separated list of browser origins allowed to call the API with credentials.
  CLIENT_ORIGIN: z.string().default('http://localhost:3000'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  // Optional: folder of the built client to serve (default: ../client/dist next to this server).
  CLIENT_DIST: z.string().min(1).optional(),
  // Use "none" only when the client and API live on different sites (requires HTTPS).
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Print variable names and problems only, never values.
  const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  console.error(`Invalid server environment:\n${problems.join('\n')}`);
  process.exit(1);
}

export const env = {
  ...parsed.data,
  isProd: parsed.data.NODE_ENV === 'production',
  clientOrigins: parsed.data.CLIENT_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean),
};
