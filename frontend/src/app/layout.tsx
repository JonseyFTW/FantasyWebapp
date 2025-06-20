import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/auth-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fantasy Football AI',
  description: 'AI-powered fantasy football analytics and insights',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <header className="bg-white shadow-sm border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <div className="flex items-center">
                    <h1 className="text-xl font-bold text-gray-900">
                      Fantasy Football AI
                    </h1>
                  </div>
                  <nav className="flex space-x-4">
                    <a href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">
                      Dashboard
                    </a>
                    <a href="/analytics" className="text-gray-600 hover:text-gray-900 transition-colors">
                      Analytics
                    </a>
                    <a href="/tools" className="text-gray-600 hover:text-gray-900 transition-colors">
                      Tools
                    </a>
                    <a href="/auth/signin" className="text-gray-600 hover:text-gray-900 transition-colors">
                      Sign In
                    </a>
                  </nav>
                </div>
              </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}