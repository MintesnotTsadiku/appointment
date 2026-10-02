import { useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import type { DeleteTarget } from '../types';
import { DeleteItemDialog } from './DeleteItemDialog';

/** Confirmed deletion of services, locations and event types, with the page's existing toasts. */
export function useItemDeletion(onRefresh: () => void) {
  const [target, setTarget] = useState<DeleteTarget | null>(null);
  const { call: deleteService } = useFrappePostCall('appointment.api.manage.delete_service');
  const { call: deleteLocation } = useFrappePostCall('appointment.api.manage.delete_location');
  const { call: deleteEventType } = useFrappePostCall('appointment.api.manage.delete_event_type');

  const confirm = async ({ type, id, label }: DeleteTarget) => {
    try {
      if (type === 'service') await deleteService({ service_id: id });
      else if (type === 'location') await deleteLocation({ location_id: id });
      else await deleteEventType({ event_type_id: id });
      toast.success(`${label} deleted successfully`);
      onRefresh();
    } catch (error) {
      toast.error((error as { message?: string })?.message || 'Failed to delete item');
    }
  };

  const dialog = (
    <DeleteItemDialog
      target={target}
      onCancel={() => setTarget(null)}
      onConfirm={() => {
        if (target) void confirm(target);
        setTarget(null);
      }}
    />
  );
  return { requestDelete: setTarget, dialog };
}
