import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import type { User } from '@fantasy-app/shared';

export interface AuthUser extends User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export function useAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user as AuthUser | undefined;
  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';

  const login = useCallback(async (provider: 'google' | 'discord') => {
    try {
      await signIn(provider, { callbackUrl: '/dashboard' });
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Failed to sign in');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Failed to sign out');
    }
  }, []);

  const requireAuth = useCallback(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/signin');
      return false;
    }
    return true;
  }, [isLoading, isAuthenticated, router]);

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    requireAuth,
  };
}