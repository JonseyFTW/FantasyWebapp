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
  // Use JWT sessions (which work) but manually handle database operations
  // adapter: PrismaAdapter(prisma),
  providers,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Persist user info in JWT token
      if (account && user) {
        return {
          ...token,
          accessToken: account.access_token,
          userId: user.id,
        };
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client from JWT token
      if (token && session.user) {
        (session.user as any).id = token.sub;
        (session as any).accessToken = token.accessToken;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      console.log('🔄 signIn callback triggered', {
        userEmail: user.email,
        provider: account?.provider,
        accountType: account?.type
      });
      
      // Manually save user to database (since PrismaAdapter has issues)
      if (account?.provider === 'google' || account?.provider === 'discord') {
        try {
          console.log('💾 Manually saving user to database...');
          
          await prisma.user.upsert({
            where: { email: user.email! },
            update: {
              displayName: user.name || 'Unknown User',
              avatarUrl: user.image,
            },
            create: {
              email: user.email!,
              displayName: user.name || 'Unknown User',
              avatarUrl: user.image,
              preferences: {
                riskTolerance: 'moderate',
                notificationSettings: {
                  email: true,
                  push: true,
                  weeklyReport: true,
                  tradeAlerts: true,
                },
                theme: 'system',
              },
            },
          });
          
          console.log('✅ User saved to database successfully');
        } catch (error) {
          console.error('❌ Failed to save user to database:', error);
          // Continue with OAuth even if database save fails
        }
        
        return true;
      }
      
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