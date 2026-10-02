/** Toast text for the `notification_status` a booking API returns, or null when nothing applies. */
export function notificationNotice(status: string | undefined): string | null {
  if (status === 'queued') return 'staff.notifications.toast.queued';
  if (status === 'disabled') return 'staff.notifications.toast.disabled';
  if (status && status !== 'not_applicable') return 'staff.notifications.toast.skipped';
  return null;
}
