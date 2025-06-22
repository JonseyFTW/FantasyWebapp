import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import DiscordProvider from 'next-auth/providers/discord';
import { prisma } from './prisma';
import type { User } from '../types/user';

const providers = [];

// Only add providers if real credentials are available
if (process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_CLIENT_ID.includes('temp')) {
  providers.push(GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    authorization: {
      params: {
        prompt: 'consent',
        access_type: 'offline',
        response_type: 'code',
      },
    },
  }));
}

if (process.env.DISCORD_CLIENT_ID && !process.env.DISCORD_CLIENT_ID.includes('temp')) {
  providers.push(DiscordProvider({
    clientId: process.env.DISCORD_CLIENT_ID!,
    clientSecret: process.env.DISCORD_CLIENT_SECRET!,
  }));
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, user }) {
      // Send user ID to the client (with database sessions, user is available directly)
      if (session.user && user) {
        (session.user as any).id = user.id;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      console.log('🔄 signIn callback triggered', {
        userEmail: user.email,
        provider: account?.provider,
        accountType: account?.type
      });
      
      // Let NextAuth handle user creation automatically via PrismaAdapter
      // Only do custom logic for specific providers if needed
      if (account?.provider === 'google' || account?.provider === 'discord') {
        console.log('✅ OAuth provider signin approved for:', user.email);
        return true;
      }
      
      console.log('✅ Default signin approved for:', user.email);
      return true;
    },
  },
  events: {
    async signIn(message) {
      console.log('User signed in:', message.user.email);
    },
    async signOut(message) {
      console.log('User signed out');
    },
    async createUser(message) {
      console.log('✅ New user created successfully:', message.user.email);
      // Skip notification creation for now to avoid potential errors
    },
  },
  debug: process.env.NEXTAUTH_DEBUG === 'true',
};