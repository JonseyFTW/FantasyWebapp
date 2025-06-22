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
  adapter: PrismaAdapter(prisma) as any,
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
      // Persist the OAuth access_token and or the user id to the token right after signin
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
      // Send properties to the client
      if (token && session.user) {
        (session.user as any).id = token.userId as string;
        (session as any).accessToken = token.accessToken as string;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Check if this sign in callback is being called in the credentials authentication flow
      if (account?.provider === 'google' || account?.provider === 'discord') {
        // Create or update user with additional fields
        try {
          await prisma.user.upsert({
            where: { email: user.email! },
            update: {
              displayName: user.name || profile?.name || 'Unknown User',
              avatarUrl: user.image || profile?.image,
            },
            create: {
              email: user.email!,
              displayName: user.name || profile?.name || 'Unknown User',
              avatarUrl: user.image || profile?.image,
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
          return true;
        } catch (error) {
          console.error('❌ Database error during sign in:', error);
          console.error('Database URL configured:', !!process.env.DATABASE_URL);
          // Allow sign in to continue even if user creation fails
          // This prevents OAuth callback errors when database is down
          return true;
        }
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
      console.log('New user created:', message.user.email);
      
      // Send welcome notification
      try {
        await prisma.notification.create({
          data: {
            userId: message.user.id,
            type: 'welcome',
            title: 'Welcome to Fantasy Football Analytics!',
            message: 'Get started by connecting your Sleeper account and exploring AI-powered insights.',
            priority: 'medium',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });
      } catch (error) {
        console.error('Error creating welcome notification:', error);
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
};