import type { AuthError, Provider } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/src/lib/supabase';

export type AuthCredentials = {
  email: string;
  password: string;
};

export type AuthResult = {
  error: string | null;
};

export async function signInWithPassword({ email, password }: AuthCredentials): Promise<AuthResult> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: mapAuthError(error),
    };
  }

  return { error: null };
}

export async function signUpWithPassword({
  email,
  password,
}: AuthCredentials): Promise<AuthResult> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: undefined,
    },
  });

  if (error) {
    return {
      error: mapAuthError(error),
    };
  }

  return { error: null };
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: undefined,
  });

  if (error) {
    return {
      error: mapAuthError(error),
    };
  }

  return { error: null };
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return {
      error: mapAuthError(error),
    };
  }

  return { error: null };
}

function mapAuthError(error: AuthError): string {
  if (error.message) {
    return error.message;
  }

  switch (error.status) {
    case 400:
      return 'Invalid email or password.';
    case 403:
      return 'This action is not allowed.';
    case 429:
      return 'Too many attempts. Try again shortly.';
    default:
      return 'Authentication request failed. Please try again.';
  }
}

export async function signOutCurrentUser(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut({ scope: 'global' });
}

export function oauthProviders(): Provider[] {
  return [];
}
