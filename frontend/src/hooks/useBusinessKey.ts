import { useFrappeGetCall } from 'frappe-react-sdk';
import { useSession } from '@/context/session';

/**
 * The staff workspace key that business APIs take: the selected organization,
 * or `Provider:<name>` for an independent provider who runs their own business.
 */
export function useBusinessKey() {
  const { session } = useSession();
  const independent = session?.state === 'individual_owner';
  // Same cache key as the dashboards, so the workspace is fetched once.
  const solo = useFrappeGetCall<{ message: { provider: string } }>(
    'appointment.scheduler.independent.workspace',
    undefined,
    independent ? `independent-dashboard-${session?.user}` : null
  );
  const provider = solo.data?.message.provider;
  const key = session?.selected?.organization || (independent && provider ? `Provider:${provider}` : undefined);
  return { key, independent, loading: independent && solo.isLoading };
}
