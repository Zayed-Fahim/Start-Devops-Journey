import type { Metadata } from 'next';
import { AuthForm } from '@/components/AuthForm';
import { AuthShell } from '@/components/AuthShell';

export const metadata: Metadata = { title: 'Create account · User Management' };

export default function RegisterPage() {
  return (
    <AuthShell title="Create your account" description="New accounts start with the USER role.">
      <AuthForm mode="register" />
    </AuthShell>
  );
}
