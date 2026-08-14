import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthForm } from '@/components/AuthForm';

export const metadata: Metadata = { title: 'Sign in · User Management' };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-headline-lg">Sign in</h1>
          <p className="text-body-sm text-fg-muted">Access the user management dashboard</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-6">
          <Suspense fallback={<div className="h-64" />}>
            <AuthForm mode="login" />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
