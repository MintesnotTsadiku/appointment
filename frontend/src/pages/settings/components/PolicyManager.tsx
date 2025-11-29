import { useState } from 'react';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Filter } from 'lucide-react';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { PolicyForm } from './PolicyForm';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select';

interface Policy {
  name: string;
  policy_name: string;
  description?: string;
  is_active: number;
  applies_to: string;
  service?: string;
  location?: string;
  provider?: string;
  deposit_percentage: number;
  deposit_amount: number;
  cancellation_window_hours: number;
  reschedule_window_hours: number;
  late_cancellation_fee_percentage: number;
  late_cancellation_fee_amount: number;
  no_show_fee_percentage: number;
  refund_policy: string;
  valid_from: string;
  valid_to?: string;
  template_used?: string;
  created_by_provider?: string;
  created_by_organization?: string;
}

interface PolicyManagerProps {
  userType: 'provider' | 'organization';
  entityId?: string;
}

export const PolicyManager = ({ userType, entityId }: PolicyManagerProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const { data, isLoading, mutate } = useFrappeGetCall<{ message: { policies: Policy[]; count: number } }>(
    'frappe_appointment.scheduler.api.policy_manager.get_user_policies',
    { user_type: userType, entity_id: entityId },
    `user-policies-${userType}-${entityId || ''}`
  );

  const { call: deletePolicy, loading: deleting } = useFrappePostCall('frappe_appointment.scheduler.api.policy_manager.delete_policy');
  const { call: updatePolicy, loading: updating } = useFrappePostCall('frappe_appointment.scheduler.api.policy_manager.update_policy');

  const policies = data?.message?.policies || [];

  const filteredPolicies = policies.filter(policy => {
    if (filterStatus === 'active') return policy.is_active === 1;
    if (filterStatus === 'inactive') return policy.is_active === 0;
    return true;
  });

  const handleCreate = () => {
    setEditingPolicy(null);
    setShowForm(true);
  };

  const handleEdit = (policy: Policy) => {
    setEditingPolicy(policy);
    setShowForm(true);
  };

  const handleDelete = async (policy: Policy) => {
    if (!confirm(`Are you sure you want to delete "${policy.policy_name}"?`)) {
      return;
    }

    try {
      await deletePolicy({ policy_name: policy.name });
      mutate();
    } catch (error: any) {
      alert(error?.message || 'Failed to delete policy. Please try again.');
    }
  };

  const handleToggleActive = async (policy: Policy) => {
    try {
      await updatePolicy({
        policy_name: policy.name,
        is_active: policy.is_active === 1 ? 0 : 1,
      });
      mutate();
    } catch (error: any) {
      alert(error?.message || 'Failed to update policy. Please try again.');
    }
  };

  const handleFormSuccess = () => {
    mutate();
    setShowForm(false);
    setEditingPolicy(null);
  };

  const getAppliesToLabel = (policy: Policy): string => {
    if (policy.applies_to === 'All Services') {
      return 'All Services';
    } else if (policy.applies_to === 'Specific Service' && policy.service) {
      return `Service: ${policy.service}`;
    } else if (policy.applies_to === 'Specific Location' && policy.location) {
      return `Location: ${policy.location}`;
    } else if (policy.applies_to === 'Specific Provider' && policy.provider) {
      return `Provider: ${policy.provider}`;
    }
    return policy.applies_to;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Policies
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage booking policies, deposits, and cancellation rules
            </p>
          </div>
          <Button
            onClick={handleCreate}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New Policy
          </Button>
        </div>

        {/* Filter */}
        <div className="mb-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Policies</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredPolicies.length} {filteredPolicies.length === 1 ? 'policy' : 'policies'}
          </p>
        </div>

        {/* Policies List */}
        {filteredPolicies.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No policies found. Create your first policy to get started.
            </p>
            <Button onClick={handleCreate} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create Policy
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPolicies.map((policy) => (
              <div
                key={policy.name}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {policy.policy_name}
                      </h4>
                      {policy.is_active === 1 ? (
                        <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle2 className="w-4 h-4" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <XCircle className="w-4 h-4" />
                          Inactive
                        </span>
                      )}
                      {policy.template_used && (
                        <span className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded">
                          {policy.template_used}
                        </span>
                      )}
                    </div>

                    {policy.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {policy.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Applies To:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {getAppliesToLabel(policy)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Deposit:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {policy.deposit_percentage > 0
                            ? `${policy.deposit_percentage}%`
                            : policy.deposit_amount > 0
                            ? formatCurrency(policy.deposit_amount)
                            : 'None'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Cancellation:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {policy.cancellation_window_hours}h
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Refund:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {policy.refund_policy}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleActive(policy)}
                      disabled={updating}
                      title={policy.is_active === 1 ? 'Deactivate' : 'Activate'}
                    >
                      {policy.is_active === 1 ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(policy)}
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(policy)}
                      disabled={deleting}
                      title="Delete"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Policy Form Modal */}
      <PolicyForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingPolicy(null);
        }}
        onSuccess={handleFormSuccess}
        userType={userType}
        entityId={entityId}
        editingPolicy={editingPolicy}
      />
    </>
  );
};





