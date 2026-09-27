import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { useSession } from '@/context/session';
export type NavigationPreference = {
    placement: 'top' | 'sidebar';
    collapsed: boolean;
};
export function useNavigationPreference() {
    const { session } = useSession();
    const query = useFrappeGetCall<{
        message: NavigationPreference;
    }>('appointment.scheduler.dashboard_config.navigation', undefined, session?.authenticated ? `navigation-${session.user}` : null);
    const post = useFrappePostCall<{
        message: NavigationPreference;
    }>('appointment.scheduler.dashboard_config.save_navigation');
    const value = query.data?.message || { placement: 'sidebar' as const, collapsed: false };
    const update = async (next: NavigationPreference) => { const result = await post.call(next); await query.mutate(result, false); };
    return { value, update, error: post.error };
}
