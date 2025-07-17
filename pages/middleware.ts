// middleware.ts
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login', // Redirect to this page if not logged in
  },
});

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/mypackages/:path*'],
};
