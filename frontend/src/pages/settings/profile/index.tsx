import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFrappeAuth } from 'frappe-react-sdk';
import { Building2, FileText, User } from 'lucide-react';
import { SettingsPage } from '@/components/settings-layout';
import { Bone, EmptyState, ErrorState } from '@/components/states';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/tabs';
import { useTranslation } from '@/lib/i18n';
import { PolicyManager } from '../components/PolicyManager';
import { AccountSection } from './AccountSection';
import { PersonalDetails } from './PersonalDetails';
import { ProfileForm } from './ProfileForm';
import { ProfileSummary } from './ProfileSummary';
import { useProfileData } from './useProfileData';

type TabType = 'profile' | 'policies';

const Profile = () => {
  const { t } = useTranslation();
  const activeTab = useTabFromUrl();
  const [tab, setTab] = useState<TabType>(activeTab);
  useEffect(() => setTab(activeTab), [activeTab]);

  const data = useProfileData();

  return (
    <SettingsPage title={t('staff.settings.profile.title')} description={t('staff.settings.profile.description')}>
      {data.isLoading ? (
        <ProfileSkeleton />
      ) : data.error ? (
        <ErrorState onRetry={data.retry} />
      ) : (
        <Tabs value={tab} onValueChange={(value) => setTab(value as TabType)} className="min-w-0">
          <TabsList>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" aria-hidden="true" />
              {t('staff.profile.tabProfile')}
            </TabsTrigger>
            <TabsTrigger value="policies" className="gap-2">
              <FileText className="h-4 w-4" aria-hidden="true" />
              {t('staff.profile.tabPolicies')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="mt-6 space-y-6">
            <ProfileTab data={data} />
          </TabsContent>
          <TabsContent value="policies" className="mt-6 min-w-0 space-y-6">
            <PoliciesTab data={data} />
          </TabsContent>
        </Tabs>
      )}
    </SettingsPage>
  );
};

type ProfileData = ReturnType<typeof useProfileData>;

function ProfileTab({ data }: { data: ProfileData }) {
  const { t } = useTranslation();
  const { currentUser } = useFrappeAuth();
  const { user, provider, organization } = data;
  const name = user?.full_name || currentUser || 'User';
  const email = user?.email || currentUser || '';
  const orgName = organization?.organization_name || provider?.organization_name || provider?.organization;

  const refetch = () => {
    data.refetchProvider();
    data.refetchUser();
  };

  return (
    <>
      <ProfileSummary
        name={name}
        email={email}
        photo={provider?.profile_photo || user?.user_image}
        organizationName={orgName}
        roleLabel={data.isOrganizationOwner && !data.isProvider ? t('staff.profile.orgOwner') : undefined}
      />
      {data.isOrganizationOwner && !data.isProvider && (
        <EmptyState
          icon={Building2}
          title={t('staff.profile.orgOnlyTitle').replace('{org}', orgName ?? '')}
          description={t('staff.profile.orgOnlyDescription')}
        />
      )}
      <PersonalDetails />
      {provider && data.isProvider && <ProfileForm provider={provider} email={email} onSaved={refetch} />}
      <AccountSection />
    </>
  );
}

function PoliciesTab({ data }: { data: ProfileData }) {
  const { t } = useTranslation();
  const providerId = data.provider?.name;
  const organizationId = data.organization?.name;
  return (
    <>
      {data.isProvider && providerId && <PolicyManager userType="provider" entityId={providerId} />}
      {data.isOrganizationOwner && organizationId && <PolicyManager userType="organization" entityId={organizationId} />}
      {!data.isProvider && !data.isOrganizationOwner && (
        <EmptyState icon={FileText} title={t('staff.profile.policiesEmpty')} />
      )}
    </>
  );
}

function useTabFromUrl(): TabType {
  const [searchParams] = useSearchParams();
  return searchParams.get('tab') === 'policies' ? 'policies' : 'profile';
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Bone className="h-10 w-56 rounded-lg" />
      <Bone className="h-28 rounded-xl" />
      <Bone className="h-64 rounded-xl" />
      <Bone className="h-40 rounded-xl" />
    </div>
  );
}

export default Profile;
