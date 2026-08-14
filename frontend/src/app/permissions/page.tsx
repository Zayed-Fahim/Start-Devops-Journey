import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { PermissionsMatrix } from '@/components/PermissionsMatrix';
import { ErrorState } from '@/components/ErrorState';
import { getPermissionCatalogue, getRoles, getSessionUser } from '@/lib/api-server';
import type { PermissionDef, RoleSummary } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Permissions · User Management' };

export default async function PermissionsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect('/login');
  if (!sessionUser.permissions?.includes('roles.read')) redirect('/');

  let roles: RoleSummary[] | null = null;
  let permissions: PermissionDef[] | null = null;
  let failure: string | null = null;

  try {
    const [roleResult, permissionResult] = await Promise.all([
      getRoles(),
      getPermissionCatalogue(),
    ]);
    roles = roleResult.data;
    permissions = permissionResult.data;
  } catch {
    failure = 'Could not load roles and permissions.';
  }

  return (
    <AppShell user={sessionUser}>
      <div>
        <h1 className="text-headline-lg">Permissions</h1>
        <p className="mt-xs text-body-md text-fg-muted">
          What each role can do. Changes take effect on the next request for everyone holding that
          role.
        </p>
      </div>

      {!roles || !permissions ? (
        <ErrorState title="Could not load permissions" message={failure ?? 'Unknown error.'} />
      ) : (
        <PermissionsMatrix
          roles={roles}
          permissions={permissions}
          canManage={sessionUser.permissions.includes('roles.manage')}
        />
      )}
    </AppShell>
  );
}
