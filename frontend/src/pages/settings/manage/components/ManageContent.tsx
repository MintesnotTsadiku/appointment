import { AlertTriangle, FolderTree, User } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/alert';
import { Bone, EmptyState, ErrorState, ListSkeleton } from '@/components/states';
import { useTranslation } from '@/lib/i18n';
import { PolicyManager } from '../../components/PolicyManager';
import type { IndividualProvider, ManagementHierarchy, OrganizationNode } from '../types';
import { HierarchyTree } from './HierarchyTree';
import { ProviderHierarchyTree } from './ProviderHierarchyTree';
import { ValidationBadge } from './ValidationBadge';
import type { ViewType } from './ManageToolbar';

interface ManageContentProps {
  viewType: ViewType;
  hierarchy?: ManagementHierarchy;
  organization?: OrganizationNode;
  isLoading: boolean;
  error?: { message?: string } | null;
  onRetry: () => void;
  onRefresh: () => void;
  refreshKey: number;
  query: string;
}

export function ManageContent({ viewType, hierarchy, organization, isLoading, error, onRetry, onRefresh, refreshKey, query }: ManageContentProps) {
  const { t } = useTranslation();
  if (isLoading) return <ManageSkeleton />;
  if (error || hierarchy?.user_type === 'error') {
    return (
      <ErrorState
        title={t('staff.manage.loadError')}
        description={error?.message || hierarchy?.error || t('staff.states.errorDescription')}
        onRetry={onRetry}
      />
    );
  }
  if (hierarchy?.user_type === 'none') {
    return <EmptyState icon={FolderTree} title={t('staff.manage.noSetup')} description={hierarchy.message || t('staff.manage.noSetupHint')} />;
  }

  return (
    <div className="space-y-6">
      {viewType === 'organization' && organization && (
        <>
          <HierarchyTree key={refreshKey} organization={organization} onRefresh={onRefresh} query={query} />
          <PolicyManager userType="organization" entityId={organization.name} />
        </>
      )}
      {viewType === 'provider' && hierarchy?.providers && (
        <ProviderHierarchyTree key={refreshKey} providers={hierarchy.providers} onRefresh={onRefresh} query={query} />
      )}
      {hierarchy?.provider && <IndividualProviderPanel provider={hierarchy.provider} onRefresh={onRefresh} query={query} />}
    </div>
  );
}

function IndividualProviderPanel({ provider, onRefresh, query }: { provider: IndividualProvider; onRefresh: () => void; query: string }) {
  const { t } = useTranslation();
  const issues = provider.validation?.issues ?? [];
  return (
    <section className="min-w-0 space-y-4 rounded-xl border bg-card p-4 shadow-card sm:p-5" aria-labelledby="manage-individual-provider">
      <div className="flex min-w-0 items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
          <User className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 id="manage-individual-provider" className="flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
            <span className="min-w-0 break-words">{provider.provider_name}</span>
            <ValidationBadge status={provider.validation?.status} />
          </h2>
          <p className="text-xs text-muted-foreground">{t('staff.manage.individualProvider')}</p>
        </div>
      </div>
      {issues.length > 0 && (
        <Alert variant="warning">
          <AlertTriangle />
          <AlertTitle className="text-sm">{t('staff.manage.issuesFound')}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-0.5 pl-4">
              {issues.map((issue, idx) => (
                <li key={idx} className="break-words">{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      <HierarchyTree provider={provider} onRefresh={onRefresh} query={query} />
    </section>
  );
}

function ManageSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4" aria-busy="true">
      <span className="sr-only">{t('staff.states.loading')}</span>
      <Bone className="h-24 rounded-xl" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="space-y-3 rounded-xl border bg-card p-4 shadow-card">
          <Bone className="h-5 w-40" />
          <ListSkeleton count={2} />
        </div>
      ))}
    </div>
  );
}
