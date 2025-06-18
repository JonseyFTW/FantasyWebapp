import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here
    console.log('Middleware executed for:', req.nextUrl.pathname);
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Check if the user is authenticated
        if (token) return true;

        // Allow access to public routes
        const { pathname } = req.nextUrl;
        const publicRoutes = [
          '/',
          '/auth/signin',
          '/auth/signout',
          '/auth/error',
          '/privacy',
          '/terms',
          '/api/auth',
        ];

        // Allow public routes and API auth routes
        return publicRoutes.some(route => 
          pathname === route || pathname.startsWith(`${route}/`)
        );
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};