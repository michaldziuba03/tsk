import z from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.preprocess(
    (p) => parseInt(p as string || '3000', 10),
    z.number().int().default(3000)
  ),
  DOMAIN: z.string().default('zooart6.yourtechnicaldomain.com'),
  API_KEY: z.string(),
  BASIC_USERNAME: z.string(),
  BASIC_PASSWORD: z.string(),
  DATABASE_URL: z.string().url(),
  BATCH_SIZE: z.preprocess(
    (p) => parseInt(p as string || '4', 10),
    z.number().int().default(4)
  ),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(parsed.error.message);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
