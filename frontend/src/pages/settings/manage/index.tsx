/**
 * Structure overview: organization, services, locations, providers and event types,
 * with create/edit/delete for the editable nodes.
 */
import { useEffect, useState } from 'react';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { RotateCw } from 'lucide-react';
import { Button } from '@/components/button';
import { SettingsPage } from '@/components/settings-layout';
import { Tabs, TabsContent } from '@/components/tabs';
import { useTranslation } from '@/lib/i18n';
import { ManageToolbar, type ViewType } from './components/ManageToolbar';
import { ManageContent } from './components/ManageContent';
import type { ManagementHierarchy } from './types';

const Manage = () => {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedOrgIndex, setSelectedOrgIndex] = useState(0);
  const [viewType, setViewType] = useState<ViewType>('organization');
  const [query, setQuery] = useState('');

  const { data, isLoading, error, mutate } = useFrappeGetCall<{ message: ManagementHierarchy }>(
    viewType === 'organization'
      ? 'appointment.api.manage.get_management_hierarchy'
      : 'appointment.api.manage.get_provider_centric_hierarchy',
    undefined,
    undefined,
    { revalidateOnFocus: false }
  );

  const hierarchy = data?.message;
  const organizations = hierarchy?.organizations || (hierarchy?.organization ? [hierarchy.organization] : []);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    mutate();
  };

  // Refetch when the view type changes.
  useEffect(() => {
    mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewType]);

  const isOrgUser = hierarchy?.user_type === 'organization_owner' || hierarchy?.user_type === 'organization_member';
  // While the other view loads there is no data yet; being on the provider view implies an org user.
  const showTabs = hierarchy ? isOrgUser && (organizations.length > 0 || !!hierarchy.providers) : viewType === 'provider';

  const toolbar = (
    <ManageToolbar
      showTabs={showTabs}
      viewType={viewType}
      organizations={viewType === 'organization' && !isLoading ? organizations : []}
      selectedOrgIndex={selectedOrgIndex}
      onSelectOrg={setSelectedOrgIndex}
      query={query}
      onQueryChange={setQuery}
    />
  );
  const content = (
    <ManageContent
      viewType={viewType}
      hierarchy={hierarchy}
      organization={organizations[selectedOrgIndex]}
      isLoading={isLoading}
      error={error}
      onRetry={() => void mutate()}
      onRefresh={handleRefresh}
      refreshKey={refreshKey}
      query={query.trim()}
    />
  );

  return (
    <SettingsPage
      title={t('staff.settings.manage.title')}
      description={t('staff.settings.manage.description')}
      headingQa="manage-heading"
      width="wide"
      actions={
        <Button variant="outline" size="sm" onClick={handleRefresh} data-qa="manage-refresh">
          <RotateCw aria-hidden="true" />
          {t('staff.manage.refresh')}
        </Button>
      }
    >
      {showTabs ? (
        <Tabs value={viewType} onValueChange={(value) => setViewType(value as ViewType)} className="space-y-4">
          {toolbar}
          <TabsContent value="organization" className="mt-0">{content}</TabsContent>
          <TabsContent value="provider" className="mt-0">{content}</TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          {toolbar}
          {content}
        </div>
      )}
    </SettingsPage>
  );
};

export default Manage;
