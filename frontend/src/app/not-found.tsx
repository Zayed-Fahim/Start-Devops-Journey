import type { Metadata } from 'next';
import { NotFoundScreen } from '@/components/NotFoundScreen';

export const metadata: Metadata = { title: '404 Not Found · User Management' };

export default function NotFound() {
  return <NotFoundScreen />;
}
