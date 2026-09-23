/**
 * Authorized session context.
 *
 * The server resolves the signed-in user's role and business memberships.
 * The client never infers access from URL parameters; it only renders what the
 * server returns and revalidates after any access change.
 */
import { createContext, ReactNode, useContext, useMemo } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';

export interface Workspace {
  organization: string;
  business_name: string;
  slug: string;
  roles: string[];
  role: 'Owner' | 'Manager' | 'Receptionist' | 'Provider' | string;
  provider: string | null;
  provider_name: string | null;
  locations: string[];
  location_names: string[];
  timezone: string | null;
  published: boolean;
  landing: string;
  is_manager: boolean;
}

export type SessionStateName =
  | 'customer'
  | 'disabled'
  | 'administrator'
  | 'workspace'
  | 'selection'
  | 'owner_setup'
  | 'no_assignment';

export interface SessionState {
  authenticated: boolean;
  user: string;
  full_name?: string;
  is_administrator: boolean;
  roles: string[];
  has_staff_role?: boolean;
  state: SessionStateName;
  workspaces: Workspace[];
  selected: Workspace | null;
  landing: string;
}

interface SessionContextValue {
  session: SessionState | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  reload: () => Promise<SessionState | undefined>;
  selectWorkspace: (organization: string) => Promise<SessionState | undefined>;
  isManager: boolean;
  isStaff: boolean;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const ALLOWED_PREFIXES = [
  '/home',
  '/calendar',
  '/reception',
  '/settings',
  '/analytics',
  '/workspaces',
  '/onboarding',
  '/no-access',
];

const MANAGER_ONLY_PREFIXES = ['/settings/business', '/settings/team', '/onboarding'];

/** Prevent open redirects and restoring destinations the user may not access. */
export function isAllowedDestination(path: string | null | undefined, session: SessionState | null): boolean {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return false;
  if (path.includes('://')) return false;
  if (!session?.authenticated) return false;
  if (session.state === 'selection' || session.state === 'owner_setup' || session.state === 'no_assignment') {
    return false;
  }
  const clean = path.split('?')[0];
  if (!ALLOWED_PREFIXES.some((prefix) => clean === prefix || clean.startsWith(prefix + '/'))) return false;
  if (session.state === 'administrator') return true;
  const role = session.selected?.role;
  if (role === 'Owner' || role === 'Manager') return true;
  if (MANAGER_ONLY_PREFIXES.some((prefix) => clean.startsWith(prefix))) return false;
  if (clean.startsWith('/reception')) return role === 'Receptionist';
  if (clean.startsWith('/analytics')) return role === 'Provider' || role === 'Receptionist';
  if (clean.startsWith('/home')) return false;
  return role === 'Provider';
}

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: SessionState }>(
    'appointment.scheduler.membership.context',
    undefined,
    'session-context',
    { revalidateOnFocus: true, revalidateOnReconnect: true }
  );
  const { call: selectCall } = useFrappePostCall('appointment.scheduler.membership.select_workspace');

  const session = data?.message ?? null;

  const value = useMemo<SessionContextValue>(() => {
    const reload = async () => {
      const fresh = await mutate();
      return fresh?.message as SessionState | undefined;
    };
    const selectWorkspace = async (organization: string) => {
      const result = await selectCall({ organization });
      await mutate();
      return result?.message as SessionState | undefined;
    };
    const isStaff = Boolean(
      session?.authenticated &&
        (session.is_administrator || session.has_staff_role || session.workspaces.length > 0)
    );
    return {
      session,
      loading: isLoading,
      error: (error as unknown as Error) ?? null,
      refresh: () => {
        void mutate();
      },
      reload,
      selectWorkspace,
      isManager: Boolean(
        session?.is_administrator || session?.selected?.is_manager || session?.state === 'owner_setup'
      ),
      isStaff,
    };
  }, [session, isLoading, error, mutate, selectCall]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within a SessionProvider');
  return context;
};
