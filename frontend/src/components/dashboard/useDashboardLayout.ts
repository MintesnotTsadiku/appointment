import { useCallback, useMemo } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import type { SavedDashboard } from './types';

/** Frappe's per-user settings store; each dashboard is one top-level key, so saves never clobber each other. */
const SETTINGS_KEY = 'Appointment Staff Dashboard';

export function useDashboardLayout(organization: string, page: string) {
  const key = `${organization}:${page}`;
  const { data, isLoading, mutate } = useFrappeGetCall<{ message: string }>(
    'frappe.model.utils.user_settings.get',
    { doctype: SETTINGS_KEY },
    'staff-dashboard-settings',
    { revalidateOnFocus: false }
  );
  const { call, loading: saving } = useFrappePostCall('frappe.model.utils.user_settings.save');

  const saved = useMemo(() => parse(data?.message)[key] as SavedDashboard | undefined, [data, key]);

  const save = useCallback(
    async (value: SavedDashboard | null) => {
      await call({ doctype: SETTINGS_KEY, user_settings: JSON.stringify({ [key]: value }) });
      await mutate();
    },
    [call, key, mutate]
  );

  return { saved: saved ?? undefined, loading: isLoading, saving, save };
}

function parse(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  try {
    const value = JSON.parse(String(raw));
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}
