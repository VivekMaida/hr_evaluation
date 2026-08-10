'use client';

import { useRole } from '@/components/RoleContext';
import { HrHome } from '@/components/home/HrHome';
import { LeadHome } from '@/components/home/LeadHome';

export default function HomePage() {
  const { role } = useRole();
  return role === 'hr' ? <HrHome /> : <LeadHome />;
}
