import { Loader2, Save } from 'lucide-react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { Button } from '@/components/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/dialog';
import { usePolicyForm } from './policy/usePolicyForm';
import { PolicyFeeFields, PolicyGeneralFields } from './policy/PolicyFormFields';
import type { OrgService, Policy, PolicyTemplate, PolicyUserType } from './policy/types';

interface PolicyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userType: PolicyUserType;
  entityId?: string;
  editingPolicy?: Policy | null;
}

export const PolicyForm = ({ isOpen, onClose, onSuccess, userType, entityId, editingPolicy }: PolicyFormProps) => {
  const { t } = useTranslation();

  const { data: templatesData } = useFrappeGetCall<{ message: { templates: PolicyTemplate[] } }>(
    'appointment.scheduler.api.policy_manager.get_policy_templates',
    undefined,
    'policy-templates'
  );
  const { data: servicesData } = useFrappeGetCall<{ message: { services: OrgService[] } }>(
    'appointment.scheduler.api.policy_manager.get_organization_services',
    userType === 'organization' ? { organization_id: entityId } : undefined,
    `org-services-${entityId || ''}`
  );
  const { call: createPolicy, loading: creating } = useFrappePostCall('appointment.scheduler.api.policy_manager.create_policy_from_template');
  const { call: updatePolicy, loading: updating } = useFrappePostCall('appointment.scheduler.api.policy_manager.update_policy');

  const templates = templatesData?.message?.templates || [];
  const services = servicesData?.message?.services || [];
  const saving = creating || updating;

  const form = usePolicyForm({
    userType,
    entityId,
    editingPolicy,
    templates,
    messages: {
      policyName: t('staff.policies.nameRequired'),
      service: t('staff.policies.serviceRequired'),
      location: t('staff.policies.locationRequired'),
      provider: t('staff.policies.providerRequired'),
      deposit: t('staff.policies.depositConflict'),
    },
  });
  const { formData } = form;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.validate()) return;
    try {
      if (editingPolicy) {
        // `policy_id` is the record name (naming series); `policy_name` is the editable label.
        await updatePolicy({ ...formData, policy_id: editingPolicy.name });
      } else {
        await createPolicy(buildCreatePayload());
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Policy operation failed:', error);
      toast.error(serverErrorMessage(error) || t('staff.policies.saveFailed'));
    }
  };

  const buildCreatePayload = () => {
    const payload: Record<string, unknown> = {
      template_key: form.selectedTemplate || 'standard',
      applies_to: formData.applies_to,
      policy_name: formData.policy_name,
      description: formData.description,
      organization: formData.organization || undefined,
      service: formData.service || undefined,
      location: formData.location || undefined,
      provider: formData.provider || undefined,
      valid_from: formData.valid_from,
      valid_to: formData.valid_to || undefined,
      deposit_percentage: formData.deposit_percentage,
      deposit_amount: formData.deposit_amount,
      cancellation_window_hours: formData.cancellation_window_hours,
      reschedule_window_hours: formData.reschedule_window_hours,
      late_cancellation_fee_percentage: formData.late_cancellation_fee_percentage,
      late_cancellation_fee_amount: formData.late_cancellation_fee_amount,
      no_show_fee_percentage: formData.no_show_fee_percentage,
      refund_policy: formData.refund_policy,
    };
    // Organization owners also send organization_id for backward compatibility.
    if (userType === 'organization' && entityId) payload.organization_id = entityId;
    return payload;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-qa="policy-form-dialog" className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0">
        <DialogHeader className="border-b p-6 pr-14">
          <DialogTitle className="text-base font-semibold">{editingPolicy ? t('staff.policies.editTitle') : t('staff.policies.createTitle')}</DialogTitle>
          <DialogDescription>{t('staff.policies.formDescription')}</DialogDescription>
        </DialogHeader>

        <form id="policy-form" onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
          <PolicyGeneralFields
            formData={formData}
            errors={form.errors}
            update={form.update}
            userType={userType}
            isEditing={!!editingPolicy}
            templates={templates}
            services={services}
            selectedTemplate={form.selectedTemplate}
            onTemplateChange={form.setSelectedTemplate}
          />
          <PolicyFeeFields formData={formData} errors={form.errors} update={form.update} />
        </form>

        <DialogFooter className="gap-2 border-t p-4 sm:px-6">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('staff.form.cancel')}
          </Button>
          <Button type="submit" form="policy-form" disabled={saving}>
            {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
            {saving ? t('staff.form.saving') : editingPolicy ? t('staff.policies.update') : t('staff.policies.createShort')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
