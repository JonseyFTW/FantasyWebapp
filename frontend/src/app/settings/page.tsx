'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Settings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sleeperUsername, setSleeperUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [userLeagues, setUserLeagues] = useState<any[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    // Load current user's Sleeper data if available
    loadUserData();
  }, [session]);

  const loadUserData = async () => {
    if (!session?.user?.email) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/${session.user.email}`);
      if (response.ok) {
        const userData = await response.json();
        if (userData.sleeperUserId) {
          // User already has Sleeper data synced
          setSleeperUsername(userData.sleeperUsername || '');
          loadUserLeagues(userData.sleeperUserId);
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserLeagues = async (sleeperUserId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sleeper/user/${sleeperUserId}/leagues`);
      if (response.ok) {
        const leagues = await response.json();
        setUserLeagues(leagues);
      }
    } catch (error) {
      console.error('Failed to load user leagues:', error);
    }
  };

  const handleSyncSleeper = async () => {
    if (!sleeperUsername.trim()) {
      setErrorMessage('Please enter your Sleeper username');
      return;
    }

    setIsSyncing(true);
    setSyncStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/sleeper/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session?.user?.email,
          sleeperUsername: sleeperUsername.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSyncStatus('success');
        setUserLeagues(result.leagues || []);
      } else {
        setSyncStatus('error');
        setErrorMessage(result.message || 'Failed to sync Sleeper data');
      }
    } catch (error) {
      setSyncStatus('error');
      setErrorMessage('Failed to connect to server');
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
        
        {/* User Info Section */}
        <div className="mb-8 pb-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
          <div className="flex items-center space-x-4">
            {session.user?.image && (
              <img 
                src={session.user.image} 
                alt="Profile" 
                className="w-12 h-12 rounded-full"
              />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">{session.user?.name}</p>
              <p className="text-sm text-gray-600">{session.user?.email}</p>
            </div>
          </div>
        </div>

        {/* Sleeper Integration Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sleeper Integration</h2>
          <p className="text-sm text-gray-600 mb-4">
            Connect your Sleeper account to sync your fantasy leagues and get AI-powered insights.
          </p>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="sleeper-username" className="block text-sm font-medium text-gray-700 mb-1">
                Sleeper Username
              </label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  id="sleeper-username"
                  value={sleeperUsername}
                  onChange={(e) => setSleeperUsername(e.target.value)}
                  placeholder="Enter your Sleeper username"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSyncing}
                />
                <button
                  onClick={handleSyncSleeper}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Syncing...</span>
                    </div>
                  ) : (
                    'Sync Leagues'
                  )}
                </button>
              </div>
            </div>

            {/* Status Messages */}
            {syncStatus === 'success' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">✅ Successfully synced Sleeper data!</p>
              </div>
            )}

            {syncStatus === 'error' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">❌ {errorMessage}</p>
              </div>
            )}
          </div>
        </div>

        {/* Synced Leagues */}
        {userLeagues.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Leagues</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {userLeagues.map((league: any) => (
                <div key={league.league_id} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900">{league.name}</h4>
                  <p className="text-sm text-gray-600">Season: {league.season}</p>
                  <p className="text-sm text-gray-600">Teams: {league.total_rosters}</p>
                  <p className="text-sm text-gray-600">
                    Status: <span className="capitalize">{league.status}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}