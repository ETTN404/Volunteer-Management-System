import { z } from 'zod';

const EnvSchema = z.object({
  VITE_API_URL: z.string().url().default(import.meta.env.PROD ? 'https://volunteer-management-system-4vvg.onrender.com/api' : 'http://localhost:8000/api'),
  VITE_MOCK_MODE: z.enum(['off', 'pending', 'all']).default('off'),
  VITE_SHOW_DEMO_ACCOUNTS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  VITE_APP_URL: z.string().optional(),
});

const parsed = EnvSchema.safeParse(import.meta.env);
if (!parsed.success) {
  console.error('Invalid frontend environment', parsed.error.flatten().fieldErrors);
}
const values = parsed.success ? parsed.data : EnvSchema.parse({});

export type MockMode = z.infer<typeof EnvSchema>['VITE_MOCK_MODE'];

export const env = {
  apiUrl: values.VITE_API_URL.replace(/\/$/, ''),
  mockMode: values.VITE_MOCK_MODE as MockMode,
  showDemoAccounts: values.VITE_SHOW_DEMO_ACCOUNTS,
  appUrl: values.VITE_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : ''),
  isDev: import.meta.env.DEV,
  isTest: import.meta.env.MODE === 'test',
} as const;
