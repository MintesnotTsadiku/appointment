/** Edit an existing service, location or event type. */
import { useEffect, useState, type FormEvent } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import type { EditTarget, OrgOptions } from '../types';
import { ItemFormDialog } from './ItemFormDialog';
import { ServiceFields } from './forms/ServiceFields';
import { LocationFields } from './forms/LocationFields';
import { EventTypeFields } from './forms/EventTypeFields';
import type { FormValues } from './forms/Field';

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: EditTarget;
  organization?: OrgOptions;
  onSuccess: () => void;
}

function formFromItem(item: EditTarget): FormValues {
  if (item.type === 'service') {
    return {
      service_name: item.service_name || '',
      duration: item.duration || 30,
      price: item.price || 0,
      currency: item.currency || 'ETB',
      description: item.description || '',
      buffer_before: item.buffer_before || 5,
      buffer_after: item.buffer_after || 5,
    };
  }
  if (item.type === 'location') {
    return {
      location_name: item.location_name || '',
      address_line_1: item.address_line_1 || '',
      address_line_2: item.address_line_2 || '',
      city: item.city || 'Addis Ababa',
      phone: item.phone || '',
      timezone: item.timezone || 'Africa/Addis_Ababa',
    };
  }
  return {
    event_type_name: item.event_type_name || '',
    service: item.service || '',
    provider: item.provider || '',
    location: item.location || '',
    description: item.description || '',
  };
}

export const EditItemModal = ({ isOpen, onClose, item, organization, onSuccess }: EditItemModalProps) => {
  const { t } = useTranslation();
  const { call, loading } = useFrappePostCall('appointment.api.manage.update_service');
  const { call: updateLocation, loading: locationLoading } = useFrappePostCall('appointment.api.manage.update_location');
  const { call: updateEventType, loading: eventTypeLoading } = useFrappePostCall('appointment.api.manage.update_event_type');
  const [formData, setFormData] = useState<FormValues>(() => formFromItem(item));

  useEffect(() => {
    if (item) setFormData(formFromItem(item));
  }, [item]);

  const setField = (field: string, value: string) => setFormData((prev) => ({ ...prev, [field]: value }));

  const submitByType = async () => {
    if (item.type === 'service') {
      await call({
        service_id: item.name,
        service_name: formData.service_name,
        duration: parseInt(formData.duration),
        price: parseFloat(formData.price),
        currency: formData.currency,
        description: formData.description,
        buffer_before: parseInt(formData.buffer_before),
        buffer_after: parseInt(formData.buffer_after),
      });
      toast.success('Service updated successfully');
    } else if (item.type === 'location') {
      await updateLocation({
        location_id: item.name,
        location_name: formData.location_name,
        address_line_1: formData.address_line_1,
        address_line_2: formData.address_line_2,
        city: formData.city,
        phone: formData.phone,
        timezone: formData.timezone,
      });
      toast.success('Location updated successfully');
    } else if (item.type === 'event_type') {
      await updateEventType({
        event_type_id: item.name,
        event_type_name: formData.event_type_name,
        service: formData.service,
        provider: formData.provider,
        location: formData.location,
        description: formData.description,
      });
      toast.success('EventType updated successfully');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await submitByType();
      onSuccess();
      onClose();
    } catch (error) {
      toast.error((error as { message?: string })?.message || 'Failed to update item');
    }
  };

  if (!item) return null;
  const fieldProps = { idPrefix: `manage-edit-${item.type}`, values: formData, onChange: setField };
  return (
    <ItemFormDialog
      open={isOpen}
      onClose={onClose}
      title={t(`staff.manage.editDialog.${item.type}`)}
      description={t('staff.manage.editDialog.description')}
      busy={loading || locationLoading || eventTypeLoading}
      submitLabel={t('staff.manage.editDialog.submit')}
      busyLabel={t('staff.manage.editDialog.busy')}
      submitQa="manage-edit-submit"
      onSubmit={handleSubmit}
    >
      {item.type === 'service' && <ServiceFields {...fieldProps} />}
      {item.type === 'location' && <LocationFields {...fieldProps} />}
      {item.type === 'event_type' && <EventTypeFields {...fieldProps} options={organization} />}
    </ItemFormDialog>
  );
};
