import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import SignInPage from '../../../app/auth/signin/page';

// Mock Next.js navigation
jest.mock('next/navigation');
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;

// Mock useAuth hook
jest.mock('../../../hooks/useAuth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('SignIn Page', () => {
  const mockPush = jest.fn();
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    });

    mockUseSearchParams.mockReturnValue(new URLSearchParams());

    mockUseAuth.mockReturnValue({
      user: undefined,
      isLoading: false,
      isAuthenticated: false,
      login: mockLogin,
      logout: jest.fn(),
      requireAuth: jest.fn(),
    });
  });

  it('should render sign in form', () => {
    render(<SignInPage />);

    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your Fantasy Football Analytics account')).toBeInTheDocument();
    expect(screen.getByTestId('google-login')).toBeInTheDocument();
    expect(screen.getByTestId('discord-login')).toBeInTheDocument();
  });

  it('should call login with Google when Google button is clicked', async () => {
    mockLogin.mockResolvedValue(undefined);
    render(<SignInPage />);

    const googleButton = screen.getByTestId('google-login');
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('google');
    });
  });

  it('should call login with Discord when Discord button is clicked', async () => {
    mockLogin.mockResolvedValue(undefined);
    render(<SignInPage />);

    const discordButton = screen.getByTestId('discord-login');
    fireEvent.click(discordButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('discord');
    });
  });

  it('should show loading state when login is in progress', async () => {
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<SignInPage />);

    const googleButton = screen.getByTestId('google-login');
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(googleButton).toBeDisabled();
      expect(screen.getByTestId('discord-login')).toBeDisabled();
    });
  });

  it('should display error message when login fails', async () => {
    mockLogin.mockRejectedValue(new Error('Login failed'));
    render(<SignInPage />);

    const googleButton = screen.getByTestId('google-login');
    fireEvent.click(googleButton);

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('Login failed')).toBeInTheDocument();
    });
  });

  it('should display URL error parameter', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('?error=OAuthSignin'));
    render(<SignInPage />);

    expect(screen.getByTestId('error-message')).toBeInTheDocument();
    expect(screen.getByText('Error occurred during sign in')).toBeInTheDocument();
  });

  it('should handle various OAuth error codes', () => {
    const errorCodes = [
      { code: 'OAuthCallback', message: 'Error occurred during OAuth callback' },
      { code: 'OAuthCreateAccount', message: 'Could not create OAuth account' },
      { code: 'EmailCreateAccount', message: 'Could not create email account' },
      { code: 'Callback', message: 'Error in callback' },
      { code: 'OAuthAccountNotLinked', message: 'OAuth account not linked' },
      { code: 'EmailSignin', message: 'Check your email for sign in link' },
      { code: 'CredentialsSignin', message: 'Invalid credentials' },
      { code: 'SessionRequired', message: 'Please sign in to access this page' },
      { code: 'UnknownError', message: 'An error occurred during sign in' },
    ];

    errorCodes.forEach(({ code, message }) => {
      mockUseSearchParams.mockReturnValue(new URLSearchParams(`?error=${code}`));
      const { unmount } = render(<SignInPage />);

      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText(message)).toBeInTheDocument();

      unmount();
    });
  });

  it('should clear error when retrying login', async () => {
    mockLogin.mockRejectedValueOnce(new Error('First attempt failed'))
            .mockResolvedValue(undefined);
    
    render(<SignInPage />);

    const googleButton = screen.getByTestId('google-login');
    
    // First attempt fails
    fireEvent.click(googleButton);
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });

    // Second attempt succeeds
    fireEvent.click(googleButton);
    await waitFor(() => {
      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });
  });

  it('should include terms and privacy policy links', () => {
    render(<SignInPage />);

    const termsLink = screen.getByRole('link', { name: /terms of service/i });
    const privacyLink = screen.getByRole('link', { name: /privacy policy/i });

    expect(termsLink).toHaveAttribute('href', '/terms');
    expect(privacyLink).toHaveAttribute('href', '/privacy');
  });

  it('should handle callbackUrl parameter', () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('?callbackUrl=/dashboard'));
    
    // This test verifies that the component reads the callbackUrl parameter
    // In the actual implementation, this would be passed to the login function
    render(<SignInPage />);
    
    // The component should render without errors when callbackUrl is present
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
  });
});