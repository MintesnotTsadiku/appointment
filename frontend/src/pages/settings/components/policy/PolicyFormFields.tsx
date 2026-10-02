import type { ReactNode } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { Textarea } from '@/components/textarea';
import { FieldHint } from '@/components/settings-layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { serviceOptionLabel, type OrgService, type PolicyTemplate, type PolicyUserType } from './types';
import type { NumericField, PolicyFormData } from './usePolicyForm';

interface FieldsProps {
  formData: PolicyFormData;
  errors: Record<string, string>;
  update: (patch: Partial<PolicyFormData>, clearError?: string) => void;
}

interface GeneralProps extends FieldsProps {
  userType: PolicyUserType;
  isEditing: boolean;
  templates: PolicyTemplate[];
  services: OrgService[];
  selectedTemplate: string;
  onTemplateChange: (key: string) => void;
}

export function PolicyGeneralFields({ formData, errors, update, userType, isEditing, templates, services, selectedTemplate, onTemplateChange }: GeneralProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      {!isEditing && (
        <Field id="template" label={t('staff.policies.template')} hint={t('staff.policies.templateHint')}>
          <Select value={selectedTemplate} onValueChange={onTemplateChange}>
            <SelectTrigger id="template">
              <SelectValue placeholder={t('staff.policies.templatePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.key} value={template.key}>
                  {template.name} - {template.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      <Field id="policy_name" label={t('staff.policies.name')} required error={errors.policy_name}>
        <Input
          id="policy_name"
          value={formData.policy_name}
          onChange={(e) => update({ policy_name: e.target.value }, 'policy_name')}
          placeholder={t('staff.policies.namePlaceholder')}
          aria-invalid={!!errors.policy_name}
        />
      </Field>

      <Field id="description" label={t('staff.policies.descriptionLabel')}>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={3}
          placeholder={t('staff.policies.descriptionPlaceholder')}
        />
      </Field>

      <Field
        id="applies_to"
        label={t('staff.policies.appliesTo')}
        required
        hint={formData.applies_to === 'All Services' && userType === 'organization' ? t('staff.policies.allServicesHint') : undefined}
      >
        {/* Providers can only create provider-specific policies. */}
        <Select value={formData.applies_to} onValueChange={(value) => update({ applies_to: value, service: '', location: '' })} disabled={userType === 'provider'}>
          <SelectTrigger id="applies_to">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {userType === 'organization' ? (
              <>
                <SelectItem value="All Services">{t('staff.policies.allServicesOrg')}</SelectItem>
                <SelectItem value="Specific Service">{t('staff.policies.specificService')}</SelectItem>
                <SelectItem value="Specific Location">{t('staff.policies.specificLocation')}</SelectItem>
              </>
            ) : (
              <SelectItem value="Specific Provider">{t('staff.policies.specificProvider')}</SelectItem>
            )}
          </SelectContent>
        </Select>
      </Field>

      {formData.applies_to === 'Specific Service' && userType === 'organization' && (
        <Field id="service" label={t('staff.policies.service')} required error={errors.service}>
          <Select value={formData.service} onValueChange={(value) => update({ service: value }, 'service')}>
            <SelectTrigger id="service" aria-invalid={!!errors.service} className={errors.service ? 'border-destructive' : undefined}>
              <SelectValue placeholder={t('staff.policies.servicePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.name} value={service.name}>
                  {serviceOptionLabel(service, services)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    </div>
  );
}

export function PolicyFeeFields({ formData, errors, update }: FieldsProps) {
  const { t } = useTranslation();
  const num = (field: NumericField, integer = false, clearError?: string) => ({
    id: field,
    type: 'number',
    min: '0',
    className: 'tabular-nums',
    value: formData[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      update({ [field]: (integer ? parseInt(e.target.value) : parseFloat(e.target.value)) || 0 }, clearError),
  });

  return (
    <div className="space-y-6">
      <FieldGroup title={t('staff.policies.depositFees')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="deposit_percentage" label={t('staff.policies.depositPercentage')}>
            <Input {...num('deposit_percentage', false, 'deposit')} max="100" />
          </Field>
          <Field id="deposit_amount" label={t('staff.policies.depositAmount')}>
            <Input {...num('deposit_amount', false, 'deposit')} />
          </Field>
        </div>
        <FieldHint error={!!errors.deposit}>{errors.deposit || t('staff.policies.depositHint')}</FieldHint>
      </FieldGroup>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="cancellation_window_hours" label={t('staff.policies.cancellationWindow')} required>
          <Input {...num('cancellation_window_hours', true)} />
        </Field>
        <Field id="reschedule_window_hours" label={t('staff.policies.rescheduleWindow')} required>
          <Input {...num('reschedule_window_hours', true)} />
        </Field>
      </div>

      <FieldGroup title={t('staff.policies.lateFees')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="late_cancellation_fee_percentage" label={t('staff.policies.lateFeePercentage')}>
            <Input {...num('late_cancellation_fee_percentage')} max="100" />
          </Field>
          <Field id="late_cancellation_fee_amount" label={t('staff.policies.lateFeeAmount')}>
            <Input {...num('late_cancellation_fee_amount')} />
          </Field>
          <Field id="no_show_fee_percentage" label={t('staff.policies.noShowFee')}>
            <Input {...num('no_show_fee_percentage')} max="100" />
          </Field>
        </div>
      </FieldGroup>

      <Field id="refund_policy" label={t('staff.policies.refundPolicy')}>
        <Select value={formData.refund_policy} onValueChange={(value) => update({ refund_policy: value })}>
          <SelectTrigger id="refund_policy">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Full Refund">{t('staff.policies.fullRefund')}</SelectItem>
            <SelectItem value="Partial Refund">{t('staff.policies.partialRefund')}</SelectItem>
            <SelectItem value="No Refund">{t('staff.policies.noRefund')}</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <FieldGroup title={t('staff.policies.validity')}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="valid_from" label={t('staff.policies.validFrom')} required>
            <Input id="valid_from" type="date" value={formData.valid_from} onChange={(e) => update({ valid_from: e.target.value })} />
          </Field>
          <Field id="valid_to" label={t('staff.policies.validTo')}>
            <Input id="valid_to" type="date" value={formData.valid_to} onChange={(e) => update({ valid_to: e.target.value })} />
          </Field>
        </div>
      </FieldGroup>
    </div>
  );
}

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 border-t pt-5">
      <legend className="float-left mb-3 w-full text-base font-semibold text-foreground">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}

function Field({ id, label, required, error, hint, children }: FieldProps) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error ? <FieldHint error>{error}</FieldHint> : hint && <FieldHint>{hint}</FieldHint>}
    </div>
  );
}
