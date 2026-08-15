import type { Metadata } from 'next';
import { AuthForm } from '@/components/AuthForm';
import { AuthShell } from '@/components/AuthShell';

export const metadata: Metadata = { title: 'Sign in · User Management' };

export default function LoginPage() {
  return (
    <AuthShell title="Sign In or Join Now!" description="Sign in or create your dashboard account.">
      <AuthForm mode="login" />
    </AuthShell>
  );
}
