'use server';

import { AuthError } from 'next-auth';
import { signIn, signOut } from '@/auth';

export type LoginState = { error: string | null };

export async function authenticate(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Enter your work email and a password.' };
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters.' };
  }

  try {
    await signIn('credentials', { email, password, redirectTo: '/' });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      // Deliberately vague: do not reveal which pilot accounts exist.
      return { error: 'That email and password do not match an account.' };
    }
    // signIn throws a redirect on success; let it through.
    throw error;
  }
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}
