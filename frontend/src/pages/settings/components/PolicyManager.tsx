import { useState } from 'react';
import { Loader2, Plus, ShieldCheck } from 'lucide-react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { serverErrorMessage } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/button';
import { Label } from '@/components/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/select';
import { SettingsSection } from '@/components/settings-layout';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/alert-dialog';
import { PolicyForm } from './PolicyForm';
import { PolicyCard } from './policy/PolicyCard';
import type { Policy, PolicyUserType } from './policy/types';

type StatusFilter = 'all' | 'active' | 'inactive';

interface PolicyManagerProps {
  userType: PolicyUserType;
  entityId?: string;
}

export const PolicyManager = ({ userType, entityId }: PolicyManagerProps) => {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Policy | null>(null);
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');

  const { data, isLoading, error, mutate } = useFrappeGetCall<{ message: { policies: Policy[]; count: number } }>(
    'appointment.scheduler.api.policy_manager.get_user_policies',
    { user_type: userType, entity_id: entityId },
    `user-policies-${userType}-${entityId || ''}`
  );
  const { call: deletePolicy, loading: deleting } = useFrappePostCall('appointment.scheduler.api.policy_manager.delete_policy');
  const { call: updatePolicy, loading: updating } = useFrappePostCall('appointment.scheduler.api.policy_manager.update_policy');

  const policies = data?.message?.policies || [];
  const filteredPolicies = policies.filter((policy) => {
    if (filterStatus === 'active') return policy.is_active === 1;
    if (filterStatus === 'inactive') return policy.is_active === 0;
    return true;
  });

  const openForm = (policy: Policy | null) => {
    setEditingPolicy(policy);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPolicy(null);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deletePolicy({ policy_name: pendingDelete.name });
      setPendingDelete(null);
      mutate();
    } catch (err) {
      toast.error((err as { message?: string })?.message || t('staff.policies.deleteFailed'));
    }
  };

  const handleToggleActive = async (policy: Policy) => {
    try {
      await updatePolicy({ policy_id: policy.name, is_active: policy.is_active === 1 ? 0 : 1 });
      mutate();
    } catch (err) {
      toast.error(serverErrorMessage(err) || t('staff.policies.updateFailed'));
    }
  };

  const createButton = (
    <Button data-qa="policy-create" size="sm" onClick={() => openForm(null)}>
      <Plus aria-hidden="true" />
      {t('staff.policies.create')}
    </Button>
  );

  return (
    <>
      <SettingsSection title={t('staff.policies.title')} description={t('staff.policies.description')} aside={createButton}>
        {isLoading ? (
          <ListSkeleton count={3} />
        ) : error && !data ? (
          <ErrorState onRetry={() => mutate()} />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Label htmlFor="policy-status-filter" className="sr-only">
                {t('staff.policies.filterLabel')}
              </Label>
              <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as StatusFilter)}>
                <SelectTrigger id="policy-status-filter" className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('staff.policies.filterAll')}</SelectItem>
                  <SelectItem value="active">{t('staff.policies.filterActive')}</SelectItem>
                  <SelectItem value="inactive">{t('staff.policies.filterInactive')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground tabular-nums">
                {filteredPolicies.length} {filteredPolicies.length === 1 ? t('staff.policies.countOne') : t('staff.policies.countMany')}
              </p>
            </div>

            {filteredPolicies.length === 0 ? (
              <EmptyState
                compact
                icon={ShieldCheck}
                title={t('staff.policies.emptyTitle')}
                action={
                  <Button variant="outline" size="sm" onClick={() => openForm(null)}>
                    <Plus aria-hidden="true" />
                    {t('staff.policies.create')}
                  </Button>
                }
              />
            ) : (
              <ul className="space-y-3">
                {filteredPolicies.map((policy) => (
                  <PolicyCard
                    key={policy.name}
                    policy={policy}
                    updating={updating}
                    deleting={deleting}
                    onToggleActive={handleToggleActive}
                    onEdit={openForm}
                    onDelete={setPendingDelete}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </SettingsSection>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('staff.policies.deleteTitle')} “{pendingDelete?.policy_name}”
            </AlertDialogTitle>
            <AlertDialogDescription>{t('staff.policies.deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('staff.form.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              data-qa="policy-delete-confirm"
              className={buttonVariants({ variant: 'destructive' })}
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
            >
              {deleting && <Loader2 className="animate-spin" aria-hidden="true" />}
              {t('staff.policies.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PolicyForm
        isOpen={showForm}
        onClose={closeForm}
        onSuccess={() => {
          mutate();
          closeForm();
        }}
        userType={userType}
        entityId={entityId}
        editingPolicy={editingPolicy}
      />
    </>
  );
};
