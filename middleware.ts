import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  /**
   * Everything except static assets and /api.
   *
   * /api is excluded on purpose: the route handlers check the session
   * themselves and answer with JSON 401, which is what a fetch caller wants.
   * A middleware redirect would hand them an HTML login page instead.
   */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};
