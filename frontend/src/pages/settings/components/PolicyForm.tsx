import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';

interface PolicyTemplate {
  key: string;
  name: string;
  description: string;
  deposit_percentage: number;
  deposit_amount: number;
  cancellation_window_hours: number;
  reschedule_window_hours: number;
  late_cancellation_fee_percentage: number;
  late_cancellation_fee_amount: number;
  no_show_fee_percentage: number;
  refund_policy: string;
}

interface PolicyFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userType: 'provider' | 'organization';
  entityId?: string;
  editingPolicy?: any;
}

export const PolicyForm = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  userType,
  entityId,
  editingPolicy 
}: PolicyFormProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [formData, setFormData] = useState({
    policy_name: '',
    description: '',
    applies_to: userType === 'provider' ? 'Specific Provider' : 'All Services',
    organization: userType === 'organization' ? entityId || '' : '',
    service: '',
    location: '',
    provider: entityId || '',
    deposit_percentage: 0,
    deposit_amount: 0,
    cancellation_window_hours: 0,
    reschedule_window_hours: 0,
    late_cancellation_fee_percentage: 0,
    late_cancellation_fee_amount: 0,
    no_show_fee_percentage: 0,
    refund_policy: 'Full Refund',
    valid_from: new Date().toISOString().split('T')[0],
    valid_to: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch templates
  const { data: templatesData } = useFrappeGetCall<{ message: { templates: PolicyTemplate[] } }>(
    'appointment.scheduler.api.policy_manager.get_policy_templates',
    undefined,
    'policy-templates'
  );

  // Fetch organization services if organization
  const { data: servicesData } = useFrappeGetCall<{ message: { services: Array<{ name: string; service_name: string; duration?: number; price?: number }> } }>(
    'appointment.scheduler.api.policy_manager.get_organization_services',
    userType === 'organization' ? { organization_id: entityId } : undefined,
    `org-services-${entityId || ''}`
  );

  const { call: createPolicy, loading: creating } = useFrappePostCall('appointment.scheduler.api.policy_manager.create_policy_from_template');
  const { call: updatePolicy, loading: updating } = useFrappePostCall('appointment.scheduler.api.policy_manager.update_policy');

  const templates = templatesData?.message?.templates || [];
  const services = servicesData?.message?.services || [];
  const isLoading = creating || updating;

  // Load editing policy data
  useEffect(() => {
    if (editingPolicy) {
      setFormData({
        policy_name: editingPolicy.policy_name || '',
        description: editingPolicy.description || '',
        applies_to: editingPolicy.applies_to || (userType === 'provider' ? 'Specific Provider' : 'All Services'),
        organization: editingPolicy.organization || (userType === 'organization' ? entityId || '' : ''),
        service: editingPolicy.service || '',
        location: editingPolicy.location || '',
        provider: editingPolicy.provider || entityId || '',
        deposit_percentage: editingPolicy.deposit_percentage || 0,
        deposit_amount: editingPolicy.deposit_amount || 0,
        cancellation_window_hours: editingPolicy.cancellation_window_hours || 0,
        reschedule_window_hours: editingPolicy.reschedule_window_hours || 0,
        late_cancellation_fee_percentage: editingPolicy.late_cancellation_fee_percentage || 0,
        late_cancellation_fee_amount: editingPolicy.late_cancellation_fee_amount || 0,
        no_show_fee_percentage: editingPolicy.no_show_fee_percentage || 0,
        refund_policy: editingPolicy.refund_policy || 'Full Refund',
        valid_from: editingPolicy.valid_from ? editingPolicy.valid_from.split(' ')[0] : new Date().toISOString().split('T')[0],
        valid_to: editingPolicy.valid_to ? editingPolicy.valid_to.split(' ')[0] : '',
      });
      if (editingPolicy.template_used) {
        setSelectedTemplate(editingPolicy.template_used);
      }
    } else {
      // Reset form for new policy
      setFormData({
        policy_name: '',
        description: '',
        applies_to: userType === 'provider' ? 'Specific Provider' : 'All Services',
        organization: userType === 'organization' ? entityId || '' : '',
        service: '',
        location: '',
        provider: entityId || '',
        deposit_percentage: 0,
        deposit_amount: 0,
        cancellation_window_hours: 0,
        reschedule_window_hours: 0,
        late_cancellation_fee_percentage: 0,
        late_cancellation_fee_amount: 0,
        no_show_fee_percentage: 0,
        refund_policy: 'Full Refund',
        valid_from: new Date().toISOString().split('T')[0],
        valid_to: '',
      });
      setSelectedTemplate('');
    }
  }, [editingPolicy, userType, entityId]);

  // Apply template when selected
  useEffect(() => {
    if (selectedTemplate && !editingPolicy) {
      const template = templates.find(t => t.key === selectedTemplate);
      if (template) {
        setFormData(prev => ({
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
      }
    }
  }, [selectedTemplate, templates, editingPolicy]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.policy_name.trim()) {
      newErrors.policy_name = 'Policy name is required';
    }

    if (formData.applies_to === 'Specific Service' && !formData.service) {
      newErrors.service = 'Service is required';
    }

    if (formData.applies_to === 'Specific Location' && !formData.location) {
      newErrors.location = 'Location is required';
    }

    if (formData.applies_to === 'Specific Provider' && !formData.provider) {
      newErrors.provider = 'Provider is required';
    }

    if (formData.deposit_percentage > 0 && formData.deposit_amount > 0) {
      newErrors.deposit = 'Cannot set both deposit percentage and amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (editingPolicy) {
        // Update existing policy
        await updatePolicy({
          policy_name: editingPolicy.name,
          ...formData,
        });
      } else {
        // Create new policy from template
        const policyData: any = {
          template_key: selectedTemplate || 'standard',
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
        
        // Pass organization_id for organization owners (for backward compatibility)
        if (userType === 'organization' && entityId) {
          policyData.organization_id = entityId;
        }
        
        await createPolicy(policyData);
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Policy operation failed:', error);
      alert(error?.message || 'Failed to save policy. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editingPolicy ? 'Edit Policy' : 'Create New Policy'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Template Selector (only for new policies) */}
          {!editingPolicy && (
            <div className="space-y-2">
              <Label htmlFor="template">Policy Template</Label>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.key} value={template.key}>
                      {template.name} - {template.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select a template to pre-fill the form with common settings
              </p>
            </div>
          )}

          {/* Policy Name */}
          <div className="space-y-2">
            <Label htmlFor="policy_name">
              Policy Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="policy_name"
              value={formData.policy_name}
              onChange={(e) => {
                setFormData({ ...formData, policy_name: e.target.value });
                if (errors.policy_name) setErrors({ ...errors, policy_name: '' });
              }}
              placeholder="e.g., Standard Deposit Policy"
              className={errors.policy_name ? 'border-red-500' : ''}
            />
            {errors.policy_name && (
              <p className="text-sm text-red-500">{errors.policy_name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Policy description..."
            />
          </div>

          {/* Applies To */}
          <div className="space-y-2">
            <Label htmlFor="applies_to">
              Applies To <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.applies_to}
              onValueChange={(value) => {
                setFormData({ ...formData, applies_to: value, service: '', location: '' });
              }}
              disabled={userType === 'provider'} // Providers can only create provider-specific policies
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {userType === 'organization' && (
                  <>
                    <SelectItem value="All Services">All Services (Organization-wide)</SelectItem>
                    <SelectItem value="Specific Service">Specific Service</SelectItem>
                    <SelectItem value="Specific Location">Specific Location</SelectItem>
                  </>
                )}
                {userType === 'provider' && (
                  <SelectItem value="Specific Provider">Specific Provider</SelectItem>
                )}
              </SelectContent>
            </Select>
            {formData.applies_to === 'All Services' && userType === 'organization' && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This policy will apply to all services in your organization
              </p>
            )}
          </div>

          {/* Service Selector (for organizations) */}
          {formData.applies_to === 'Specific Service' && userType === 'organization' && (
            <div className="space-y-2">
              <Label htmlFor="service">
                Service <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.service}
                onValueChange={(value) => {
                  setFormData({ ...formData, service: value });
                  if (errors.service) setErrors({ ...errors, service: '' });
                }}
              >
                <SelectTrigger className={errors.service ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => {
                    // Check if there are duplicate service names
                    const duplicateCount = services.filter(s => s.service_name === service.service_name).length;
                    
                    // Build display name with additional info for duplicates
                    let displayName = service.service_name;
                    if (duplicateCount > 1) {
                      const parts = [service.service_name];
                      if (service.duration) {
                        parts.push(`${service.duration}min`);
                      }
                      if (service.price !== undefined && service.price > 0) {
                        parts.push(`${service.price} ETB`);
                      }
                      parts.push(`(${service.name})`);
                      displayName = parts.join(' - ');
                    } else if (service.duration || (service.price !== undefined && service.price > 0)) {
                      // Show duration/price even for unique names if available
                      const parts = [service.service_name];
                      if (service.duration) {
                        parts.push(`${service.duration}min`);
                      }
                      if (service.price !== undefined && service.price > 0) {
                        parts.push(`${service.price} ETB`);
                      }
                      displayName = parts.join(' - ');
                    }
                    
                    return (
                      <SelectItem key={service.name} value={service.name}>
                        {displayName}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.service && (
                <p className="text-sm text-red-500">{errors.service}</p>
              )}
            </div>
          )}

          {/* Deposit Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Deposit & Fees
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deposit_percentage">Deposit Percentage (%)</Label>
                <Input
                  id="deposit_percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.deposit_percentage}
                  onChange={(e) => {
                    setFormData({ ...formData, deposit_percentage: parseFloat(e.target.value) || 0 });
                    if (errors.deposit) setErrors({ ...errors, deposit: '' });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit_amount">Deposit Amount (ETB)</Label>
                <Input
                  id="deposit_amount"
                  type="number"
                  min="0"
                  value={formData.deposit_amount}
                  onChange={(e) => {
                    setFormData({ ...formData, deposit_amount: parseFloat(e.target.value) || 0 });
                    if (errors.deposit) setErrors({ ...errors, deposit: '' });
                  }}
                />
              </div>
            </div>
            {errors.deposit && (
              <p className="text-sm text-red-500 mt-2">{errors.deposit}</p>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Use either percentage or fixed amount, not both
            </p>
          </div>

          {/* Cancellation Windows */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cancellation_window_hours">
                Cancellation Window (hours) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cancellation_window_hours"
                type="number"
                min="0"
                value={formData.cancellation_window_hours}
                onChange={(e) => setFormData({ ...formData, cancellation_window_hours: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reschedule_window_hours">
                Reschedule Window (hours) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="reschedule_window_hours"
                type="number"
                min="0"
                value={formData.reschedule_window_hours}
                onChange={(e) => setFormData({ ...formData, reschedule_window_hours: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Late Fees */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Late Fees
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="late_cancellation_fee_percentage">Late Cancellation Fee (%)</Label>
                <Input
                  id="late_cancellation_fee_percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.late_cancellation_fee_percentage}
                  onChange={(e) => setFormData({ ...formData, late_cancellation_fee_percentage: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="late_cancellation_fee_amount">Late Cancellation Fee (ETB)</Label>
                <Input
                  id="late_cancellation_fee_amount"
                  type="number"
                  min="0"
                  value={formData.late_cancellation_fee_amount}
                  onChange={(e) => setFormData({ ...formData, late_cancellation_fee_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Label htmlFor="no_show_fee_percentage">No Show Fee (%)</Label>
              <Input
                id="no_show_fee_percentage"
                type="number"
                min="0"
                max="100"
                value={formData.no_show_fee_percentage}
                onChange={(e) => setFormData({ ...formData, no_show_fee_percentage: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Refund Policy */}
          <div className="space-y-2">
            <Label htmlFor="refund_policy">Refund Policy</Label>
            <Select
              value={formData.refund_policy}
              onValueChange={(value) => setFormData({ ...formData, refund_policy: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Full Refund">Full Refund</SelectItem>
                <SelectItem value="Partial Refund">Partial Refund</SelectItem>
                <SelectItem value="No Refund">No Refund</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Validity Period */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Validity Period
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="valid_from">
                  Valid From <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="valid_from"
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valid_to">Valid To (optional)</Label>
                <Input
                  id="valid_to"
                  type="date"
                  value={formData.valid_to}
                  onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : editingPolicy ? 'Update Policy' : 'Create Policy'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

