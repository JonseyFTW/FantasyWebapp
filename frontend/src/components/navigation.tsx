'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

export function Navigation() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <nav className="flex space-x-4">
        <div className="w-16 h-6 bg-gray-200 animate-pulse rounded"></div>
        <div className="w-16 h-6 bg-gray-200 animate-pulse rounded"></div>
        <div className="w-16 h-6 bg-gray-200 animate-pulse rounded"></div>
      </nav>
    );
  }

  if (session) {
    return (
      <nav className="flex items-center space-x-4">
        <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">
          Dashboard
        </Link>
        <Link href="/analytics" className="text-gray-600 hover:text-gray-900 transition-colors">
          Analytics
        </Link>
        <Link href="/tools" className="text-gray-600 hover:text-gray-900 transition-colors">
          Tools
        </Link>
        <Link href="/settings" className="text-gray-600 hover:text-gray-900 transition-colors">
          Settings
        </Link>
        
        {/* User Menu */}
        <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
          {session.user?.image && (
            <img 
              src={session.user.image} 
              alt="Profile" 
              className="w-8 h-8 rounded-full"
            />
          )}
          <div className="text-sm">
            <p className="text-gray-900 font-medium">{session.user?.name}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex space-x-4">
      <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">
        Dashboard
      </Link>
      <Link href="/analytics" className="text-gray-600 hover:text-gray-900 transition-colors">
        Analytics
      </Link>
      <Link href="/tools" className="text-gray-600 hover:text-gray-900 transition-colors">
        Tools
      </Link>
      <Link href="/auth/signin" className="text-gray-600 hover:text-gray-900 transition-colors">
        Sign In
      </Link>
    </nav>
  );
}