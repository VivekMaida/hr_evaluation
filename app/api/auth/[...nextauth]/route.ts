import { handlers } from '@/auth';

export const { GET, POST } = handlers;

// bcrypt and Prisma both need Node APIs; this route must not run on the edge.
export const runtime = 'nodejs';
