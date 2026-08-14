import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthForm } from '@/components/AuthForm';

export const metadata: Metadata = { title: 'Create account · User Management' };

export default function RegisterPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-4 text-fg">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Create account</h1>
          <p className="text-sm text-fg-muted">New accounts start with the USER role</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6">
          <Suspense fallback={<div className="h-80" />}>
            <AuthForm mode="register" />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
