import { useFrappeGetCall } from 'frappe-react-sdk';
import type { Report } from './types';

export function useReport(organization: string | undefined, period: number) {
  return useFrappeGetCall<{ message: Report }>(
    'appointment.scheduler.analytics.overview',
    { organization: organization || '', period },
    `analytics-${organization || 'none'}-${period}`,
    { revalidateOnFocus: true }
  );
}
