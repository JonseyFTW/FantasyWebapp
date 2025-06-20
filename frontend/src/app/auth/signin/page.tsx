'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Chrome, MessageCircle, Loader2 } from 'lucide-react';

function SignInForm() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const errorParam = searchParams.get('error');

  const handleLogin = async (provider: 'google' | 'discord') => {
    try {
      setIsLoading(provider);
      setError(null);
      await login(provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your Fantasy Football Analytics account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(error || errorParam) && (
            <Alert variant="destructive" data-testid="error-message">
              <AlertDescription>
                {error || 
                  (errorParam === 'OAuthSignin' && 'Error occurred during sign in') ||
                  (errorParam === 'OAuthCallback' && 'Error occurred during OAuth callback') ||
                  (errorParam === 'OAuthCreateAccount' && 'Could not create OAuth account') ||
                  (errorParam === 'EmailCreateAccount' && 'Could not create email account') ||
                  (errorParam === 'Callback' && 'Error in callback') ||
                  (errorParam === 'OAuthAccountNotLinked' && 'OAuth account not linked') ||
                  (errorParam === 'EmailSignin' && 'Check your email for sign in link') ||
                  (errorParam === 'CredentialsSignin' && 'Invalid credentials') ||
                  (errorParam === 'SessionRequired' && 'Please sign in to access this page') ||
                  'An error occurred during sign in'
                }
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => handleLogin('google')}
              disabled={isLoading !== null}
              data-testid="google-login"
            >
              {isLoading === 'google' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Chrome className="mr-2 h-4 w-4" />
              )}
              Continue with Google
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => handleLogin('discord')}
              disabled={isLoading !== null}
              data-testid="discord-login"
            >
              {isLoading === 'discord' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MessageCircle className="mr-2 h-4 w-4" />
              )}
              Continue with Discord
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              By signing in, you agree to our{' '}
              <a href="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}