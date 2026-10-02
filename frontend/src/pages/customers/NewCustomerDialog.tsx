import { useState, type FormEvent } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { FormDialog } from '@/pages/reception/appointment-form/FormDialog';
import { ContactFields, type ContactDraft } from './ContactFields';
import { CUSTOMERS_API, type CustomerDetail } from './types';

interface NewCustomerDialogProps {
  open: boolean;
  organization: string;
  onClose: () => void;
  onCreated: (customerId: string) => void;
}

const EMPTY: ContactDraft = { display_name: '', primary_email: '', primary_phone: '' };

/** Creates a customer with name and optional contact details. */
export function NewCustomerDialog({ open, organization, onClose, onCreated }: NewCustomerDialogProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ContactDraft>(EMPTY);
  const [nameError, setNameError] = useState('');
  const { call, loading } = useFrappePostCall<{ message: CustomerDetail }>(`${CUSTOMERS_API}.save`);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.display_name.trim()) {
      setNameError(t('staff.form.required'));
      return;
    }
    try {
      const result = await call({ organization, ...draft });
      toast.success(t('staff.customers.saved'));
      setDraft(EMPTY);
      onClose();
      onCreated(result.message.name);
    } catch (error) {
      toast.error(serverErrorMessage(error) || t('staff.customers.saveFailed'));
    }
  }

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      qa="customer-new-dialog"
      title={t('staff.customers.new')}
      description={t('staff.customers.description')}
      submitQa="customer-new-submit"
      submitLabel={t('staff.customers.save')}
      pendingLabel={t('staff.form.saving')}
      pending={loading}
      onSubmit={submit}
    >
      <ContactFields
        idPrefix="new-customer"
        value={draft}
        nameError={nameError}
        onChange={(patch) => {
          setDraft((current) => ({ ...current, ...patch }));
          if (patch.display_name) setNameError('');
        }}
      />
    </FormDialog>
  );
}
