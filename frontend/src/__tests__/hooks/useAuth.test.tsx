import { renderHook, act } from '@testing-library/react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';

// Mock NextAuth
jest.mock('next-auth/react');
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;

// Mock Next.js router
jest.mock('next/navigation');
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('useAuth Hook', () => {
  const mockPush = jest.fn();
  const mockRouter = {
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
  });

  describe('when user is loading', () => {
    it('should return loading state', () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'loading',
        update: jest.fn(),
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeUndefined();
    });
  });

  describe('when user is authenticated', () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
      displayName: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: mockUser,
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });
    });

    it('should return authenticated state', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it('should call signOut on logout', async () => {
      mockSignOut.mockResolvedValue({ url: 'http://localhost:3000' });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' });
    });

    it('should not redirect when requireAuth is called', () => {
      const { result } = renderHook(() => useAuth());

      const requireAuthResult = result.current.requireAuth();

      expect(requireAuthResult).toBe(true);
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('when user is unauthenticated', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: jest.fn(),
      });
    });

    it('should return unauthenticated state', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeUndefined();
    });

    it('should call signIn with Google provider', async () => {
      mockSignIn.mockResolvedValue({ 
        error: null, 
        status: 200, 
        ok: true, 
        url: 'http://localhost:3000/dashboard' 
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login('google');
      });

      expect(mockSignIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' });
    });

    it('should call signIn with Discord provider', async () => {
      mockSignIn.mockResolvedValue({ 
        error: null, 
        status: 200, 
        ok: true, 
        url: 'http://localhost:3000/dashboard' 
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login('discord');
      });

      expect(mockSignIn).toHaveBeenCalledWith('discord', { callbackUrl: '/dashboard' });
    });

    it('should throw error when login fails', async () => {
      mockSignIn.mockRejectedValue(new Error('Login failed'));

      const { result } = renderHook(() => useAuth());

      await expect(act(async () => {
        await result.current.login('google');
      })).rejects.toThrow('Failed to sign in');
    });

    it('should redirect to signin when requireAuth is called', () => {
      const { result } = renderHook(() => useAuth());

      const requireAuthResult = result.current.requireAuth();

      expect(requireAuthResult).toBe(false);
      expect(mockPush).toHaveBeenCalledWith('/auth/signin');
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user123',
            email: 'test@example.com',
            displayName: 'Test User',
          },
          expires: '2024-12-31',
        },
        status: 'authenticated',
        update: jest.fn(),
      });
    });

    it('should handle logout errors gracefully', async () => {
      mockSignOut.mockRejectedValue(new Error('Logout failed'));

      const { result } = renderHook(() => useAuth());

      await expect(act(async () => {
        await result.current.logout();
      })).rejects.toThrow('Failed to sign out');
    });
  });
});