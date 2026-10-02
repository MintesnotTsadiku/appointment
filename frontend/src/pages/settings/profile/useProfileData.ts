import { useFrappeGetCall } from 'frappe-react-sdk';

export interface ProviderProfile {
  name: string;
  provider_name: string;
  full_name: string;
  email: string;
  phone?: string;
  bio?: string;
  timezone: string;
  language: string;
  business_type?: string;
  profile_photo?: string;
  organization?: string;
  organization_name?: string;
}

interface UserInfo {
  full_name: string;
  email: string;
  user_image?: string;
}

interface OrgRef {
  name: string;
  organization_name: string;
}

interface Hierarchy {
  user_type: 'organization_owner' | 'organization_member' | 'individual' | 'none';
  organization?: OrgRef;
  organizations?: OrgRef[];
}

/** Loads the signed-in user, their provider record (absent for org owners) and org hierarchy. */
export function useProfileData() {
  const user = useFrappeGetCall<{ message: UserInfo }>('frappe.auth.get_logged_user', undefined, 'user-info');
  // Expected to fail for organization owners without a provider record.
  const provider = useFrappeGetCall<{ message: ProviderProfile }>('appointment.onboarding.get_provider_profile', undefined, 'provider-profile');
  const hierarchy = useFrappeGetCall<{ message: Hierarchy }>('appointment.api.manage.get_management_hierarchy', undefined, 'management-hierarchy');

  const userType = hierarchy.data?.message?.user_type;
  const organization = hierarchy.data?.message?.organization || hierarchy.data?.message?.organizations?.[0];
  const providerProfile = provider.error ? undefined : provider.data?.message;

  return {
    user: user.data?.message,
    provider: providerProfile,
    organization,
    isOrganizationOwner: userType === 'organization_owner' || userType === 'organization_member',
    isProvider: !!providerProfile?.name,
    isLoading: user.isLoading || provider.isLoading || hierarchy.isLoading,
    error: user.error,
    refetchUser: user.mutate,
    refetchProvider: provider.mutate,
    retry: () => {
      user.mutate();
      provider.mutate();
      hierarchy.mutate();
    },
  };
}
