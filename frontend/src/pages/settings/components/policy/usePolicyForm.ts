import { useEffect, useState } from 'react';
import type { Policy, PolicyTemplate, PolicyUserType } from './types';

export type PolicyFormData = ReturnType<typeof blankForm>;
export type NumericField =
  | 'deposit_percentage'
  | 'deposit_amount'
  | 'cancellation_window_hours'
  | 'reschedule_window_hours'
  | 'late_cancellation_fee_percentage'
  | 'late_cancellation_fee_amount'
  | 'no_show_fee_percentage';

export interface PolicyErrorMessages {
  policyName: string;
  service: string;
  location: string;
  provider: string;
  deposit: string;
}

const today = () => new Date().toISOString().split('T')[0];

function blankForm(userType: PolicyUserType, entityId?: string) {
  return {
    policy_name: '',
    description: '',
    applies_to: userType === 'provider' ? 'Specific Provider' : 'All Services',
    organization: userType === 'organization' ? entityId || '' : '',
    service: '',
    location: '',
    provider: userType === 'provider' ? entityId || '' : '',
    deposit_percentage: 0,
    deposit_amount: 0,
    cancellation_window_hours: 0,
    reschedule_window_hours: 0,
    late_cancellation_fee_percentage: 0,
    late_cancellation_fee_amount: 0,
    no_show_fee_percentage: 0,
    refund_policy: 'Full Refund',
    valid_from: today(),
    valid_to: '',
  };
}

function fromPolicy(policy: Policy, userType: PolicyUserType, entityId?: string): PolicyFormData {
  const blank = blankForm(userType, entityId);
  return {
    policy_name: policy.policy_name || '',
    description: policy.description || '',
    applies_to: policy.applies_to || blank.applies_to,
    organization: policy.organization || blank.organization,
    service: policy.service || '',
    location: policy.location || '',
    provider: policy.provider || blank.provider,
    deposit_percentage: policy.deposit_percentage || 0,
    deposit_amount: policy.deposit_amount || 0,
    cancellation_window_hours: policy.cancellation_window_hours || 0,
    reschedule_window_hours: policy.reschedule_window_hours || 0,
    late_cancellation_fee_percentage: policy.late_cancellation_fee_percentage || 0,
    late_cancellation_fee_amount: policy.late_cancellation_fee_amount || 0,
    no_show_fee_percentage: policy.no_show_fee_percentage || 0,
    refund_policy: policy.refund_policy || 'Full Refund',
    valid_from: policy.valid_from ? policy.valid_from.split(' ')[0] : today(),
    valid_to: policy.valid_to ? policy.valid_to.split(' ')[0] : '',
  };
}

/** Form state for creating or editing a policy, including template prefill and validation. */
export function usePolicyForm(opts: {
  userType: PolicyUserType;
  entityId?: string;
  editingPolicy?: Policy | null;
  templates: PolicyTemplate[];
  messages: PolicyErrorMessages;
}) {
  const { userType, entityId, editingPolicy, templates, messages } = opts;
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [formData, setFormData] = useState<PolicyFormData>(() => blankForm(userType, entityId));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormData(editingPolicy ? fromPolicy(editingPolicy, userType, entityId) : blankForm(userType, entityId));
    setSelectedTemplate(editingPolicy?.template_used || '');
    setErrors({});
  }, [editingPolicy, userType, entityId]);

  // Templates only prefill new policies.
  useEffect(() => {
    if (!selectedTemplate || editingPolicy) return;
    const template = templates.find((item) => item.key === selectedTemplate);
    if (!template) return;
    setFormData((prev) => ({
      ...prev,
      policy_name: prev.policy_name || template.name,
      description: prev.description || template.description,
      deposit_percentage: template.deposit_percentage,
      deposit_amount: template.deposit_amount,
      cancellation_window_hours: template.cancellation_window_hours,
      reschedule_window_hours: template.reschedule_window_hours,
      late_cancellation_fee_percentage: template.late_cancellation_fee_percentage,
      late_cancellation_fee_amount: template.late_cancellation_fee_amount,
      no_show_fee_percentage: template.no_show_fee_percentage,
      refund_policy: template.refund_policy,
    }));
  }, [selectedTemplate, templates, editingPolicy]);

  const update = (patch: Partial<PolicyFormData>, clearError?: string) => {
    setFormData((prev) => ({ ...prev, ...patch }));
    if (clearError) setErrors((prev) => (prev[clearError] ? { ...prev, [clearError]: '' } : prev));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!formData.policy_name.trim()) next.policy_name = messages.policyName;
    if (formData.applies_to === 'Specific Service' && !formData.service) next.service = messages.service;
    if (formData.applies_to === 'Specific Location' && !formData.location) next.location = messages.location;
    if (formData.applies_to === 'Specific Provider' && !formData.provider) next.provider = messages.provider;
    if (formData.deposit_percentage > 0 && formData.deposit_amount > 0) next.deposit = messages.deposit;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  return { formData, errors, update, validate, selectedTemplate, setSelectedTemplate };
}
