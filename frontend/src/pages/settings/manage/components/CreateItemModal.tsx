/** Create a service, location or event type. */
import { useEffect, useState, type FormEvent } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import type { EditableType, OrgOptions } from '../types';
import { ItemFormDialog } from './ItemFormDialog';
import { ServiceFields } from './forms/ServiceFields';
import { LocationFields } from './forms/LocationFields';
import { EventTypeFields } from './forms/EventTypeFields';
import type { FormValues } from './forms/Field';

interface CreateContext {
  provider?: string;
  service?: string;
  location?: string;
  organization?: string;
}

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: EditableType;
  organizationId?: string;
  organization?: OrgOptions;
  context?: CreateContext;
  onSuccess: () => void;
}

function blankForm(context?: CreateContext): FormValues {
  return {
    service_name: '',
    duration: 30,
    price: 0,
    currency: 'ETB',
    description: '',
    buffer_before: 5,
    buffer_after: 5,
    location_name: '',
    address_line_1: '',
    address_line_2: '',
    city: 'Addis Ababa',
    phone: '',
    timezone: 'Africa/Addis_Ababa',
    event_type_name: '',
    service: context?.service || '',
    provider: context?.provider || '',
    location: context?.location || '',
  };
}

export const CreateItemModal = ({ isOpen, onClose, type, organizationId, organization, context, onSuccess }: CreateItemModalProps) => {
  const { t } = useTranslation();
  const { call: createService, loading } = useFrappePostCall('appointment.api.manage.create_service');
  const { call: createLocation, loading: locationLoading } = useFrappePostCall('appointment.api.manage.create_location');
  const { call: createEventType, loading: eventTypeLoading } = useFrappePostCall('appointment.api.manage.create_event_type');
  const [formData, setFormData] = useState<FormValues>(() => blankForm(context));

  useEffect(() => {
    if (context) {
      setFormData((prev) => ({
        ...prev,
        service: context.service || prev.service,
        provider: context.provider || prev.provider,
        location: context.location || prev.location,
      }));
    }
  }, [context]);

  const setField = (field: string, value: string) => setFormData((prev) => ({ ...prev, [field]: value }));

  const submitByType = async () => {
    if (type === 'service') {
      await createService({
        service_name: formData.service_name,
        duration: parseInt(formData.duration),
        organization: organizationId,
        price: parseFloat(formData.price),
        currency: formData.currency,
        description: formData.description,
        buffer_before: parseInt(formData.buffer_before),
        buffer_after: parseInt(formData.buffer_after),
      });
      toast.success('Service created successfully');
    } else if (type === 'location') {
      await createLocation({
        location_name: formData.location_name,
        organization: organizationId,
        address_line_1: formData.address_line_1,
        address_line_2: formData.address_line_2,
        city: formData.city,
        phone: formData.phone,
        timezone: formData.timezone,
      });
      toast.success('Location created successfully');
    } else {
      await createEventType({
        event_type_name: formData.event_type_name,
        service: formData.service,
        provider: formData.provider,
        location: formData.location,
        description: formData.description,
      });
      toast.success('EventType created successfully');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await submitByType();
      onSuccess();
      onClose();
      setFormData(blankForm(context));
    } catch (error) {
      toast.error((error as { message?: string })?.message || 'Failed to create item');
    }
  };

  const fieldProps = { idPrefix: `manage-create-${type}`, values: formData, onChange: setField };
  return (
    <ItemFormDialog
      open={isOpen}
      onClose={onClose}
      title={t(`staff.manage.createDialog.${type}`)}
      description={t('staff.manage.createDialog.description')}
      busy={loading || locationLoading || eventTypeLoading}
      submitLabel={t('staff.manage.createDialog.submit')}
      busyLabel={t('staff.manage.createDialog.busy')}
      submitQa="manage-create-submit"
      onSubmit={handleSubmit}
    >
      {type === 'service' && <ServiceFields {...fieldProps} />}
      {type === 'location' && <LocationFields {...fieldProps} />}
      {type === 'event_type' && <EventTypeFields {...fieldProps} options={organization} creating />}
    </ItemFormDialog>
  );
};
