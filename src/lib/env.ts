import { z } from 'zod';

const EnvironmentSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z
    .string()
    .url('EXPO_PUBLIC_SUPABASE_URL must be a valid URL')
    .min(1, 'EXPO_PUBLIC_SUPABASE_URL is required'),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(16, 'EXPO_PUBLIC_SUPABASE_ANON_KEY must be set')
    .max(1000),
  EXPO_PUBLIC_APP_ENV: z
    .enum(['development', 'preview', 'production', 'test'])
    .default('development'),
});

export type AppEnvironment = z.infer<typeof EnvironmentSchema>;

type MissingEnvError = {
  code: 'MISSING_ENV';
  issues: { path: string; message: string }[];
};

export const environmentResult = EnvironmentSchema.safeParse(process.env);

export const appEnvironment: AppEnvironment =
  environmentResult.success
    ? environmentResult.data
    : {
        EXPO_PUBLIC_SUPABASE_URL: '',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: '',
        EXPO_PUBLIC_APP_ENV: 'development',
      };

function formatIssues(errors: z.ZodError['issues']) {
  return errors.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}

export function assertEnvironment(): AppEnvironment {
  if (!environmentResult.success) {
    const details: MissingEnvError = {
      code: 'MISSING_ENV',
      issues: formatIssues(environmentResult.error.issues),
    };

    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        `Environment validation failed: ${details.issues
          .map((item) => `${item.path} ${item.message}`)
          .join(', ')}`
      );
    }
  }

  return appEnvironment;
}
