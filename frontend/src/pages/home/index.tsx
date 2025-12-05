import { useState } from 'react';
import { OnboardingProvider, useOnboarding } from '@/context/onboarding';
import { useFrappeAuth, useFrappeGetCall } from 'frappe-react-sdk';
import Spinner from '@/components/spinner';
import OnboardingWizard from './sections/OnboardingWizard';
import Dashboard from './sections/Dashboard';
import { OnboardingTypeSelection } from './components/OnboardingTypeSelection';
import { Button } from '@/components/button';
import { Settings, RefreshCw } from 'lucide-react';

const HomeContent = () => {
  const { progress, loading, error, setOnboardingType, resetOnboardingType, refreshProgress } = useOnboarding();
  const { currentUser } = useFrappeAuth();
  const isAdministrator = currentUser === 'Administrator';

  // Fetch user data for welcome message
  const { data: userData } = useFrappeGetCall<{ message: { full_name?: string; email?: string; name?: string } }>(
    'frappe.auth.get_logged_user',
    undefined,
    'user-info'
  );

  // Try to get provider profile as fallback (more reliable for full_name)
  const { data: providerData } = useFrappeGetCall<{ message: { full_name?: string; provider_name?: string } }>(
    'frappe_appointment.onboarding.get_provider_profile',
    undefined,
    'provider-profile-home',
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  // Try multiple fallbacks to get user name
  // Priority: provider full_name > user full_name > provider name > email username > currentUser
  const userName = providerData?.message?.full_name ||
                   userData?.message?.full_name || 
                   providerData?.message?.provider_name ||
                   userData?.message?.name ||
                   (userData?.message?.email ? userData.message.email.split('@')[0] : null) ||
                   currentUser || 
                   'User';

  if (loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Ambient Background Glows */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div 
            className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px] opacity-30"
            style={{ backgroundColor: 'var(--glow-primary)' }}
          />
          <div 
            className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-[100px] opacity-20"
            style={{ backgroundColor: 'var(--glow-secondary)' }}
          />
        </div>
        <div className="text-center relative z-10">
          <Spinner className="mx-auto mb-4" />
          <p style={{ color: 'var(--text-secondary)' }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Ambient Background Glows */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div 
            className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-[100px] opacity-30"
            style={{ backgroundColor: 'var(--glow-primary)' }}
          />
          <div 
            className="absolute top-1/2 -left-40 w-80 h-80 rounded-full blur-[100px] opacity-20"
            style={{ backgroundColor: 'var(--glow-secondary)' }}
          />
        </div>
        <div 
          className="text-center max-w-md mx-auto p-8 rounded-2xl backdrop-blur-sm relative z-10"
          style={{ 
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)'
          }}
        >
          <div className="mb-4" style={{ color: 'var(--status-cancelled)' }}>
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 
            className="text-2xl font-bold mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Something went wrong
          </h2>
          <p 
            className="mb-6"
            style={{ color: 'var(--text-secondary)' }}
          >
            {error.message || 'Unable to load your dashboard. Please try again.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-gradient-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Show type selection if user hasn't chosen yet
  if (!progress?.onboarding_type) {
    return <OnboardingTypeSelection onSelect={setOnboardingType} />;
  }

  // Show onboarding wizard if not complete
  if (!progress?.onboarding_complete) {
    const wizard = (
      <div className="px-4">
        <OnboardingWizard />
      </div>
    );
    if (isAdministrator) {
      return (
        <div className="relative">
          <div className="fixed bottom-6 right-6 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const newType = progress.onboarding_type === 'individual' ? 'organization' : 'individual';
                  await setOnboardingType(newType);
                  refreshProgress();
                  window.location.reload();
                }}
                className="text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-2" />
                Switch to {progress.onboarding_type === 'individual' ? 'Organization' : 'Individual'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (confirm('Reset onboarding? This will allow you to choose a new onboarding type.')) {
                    await resetOnboardingType();
                    refreshProgress();
                    window.location.reload();
                  }
                }}
                className="text-xs"
              >
                <Settings className="w-3 h-3 mr-2" />
                Reset & Choose Type
              </Button>
            </div>
          </div>
          {wizard}
        </div>
      );
    }
    return wizard;
  }

  // Show dashboard if onboarding complete
  // For Administrator: Add option to switch onboarding type
  if (isAdministrator) {
    return (
      <div className="relative">
        {/* Admin Controls - Floating Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-2 flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                // Reset onboarding type to allow switching
                const newType = progress.onboarding_type === 'individual' ? 'organization' : 'individual';
                await setOnboardingType(newType);
                refreshProgress();
                window.location.reload();
              }}
              className="text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-2" />
              Switch to {progress.onboarding_type === 'individual' ? 'Organization' : 'Individual'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                // For Administrator: reset to show type selection
                if (confirm('Reset onboarding? This will allow you to choose a new onboarding type.')) {
                  await resetOnboardingType();
                  refreshProgress();
                  window.location.reload();
                }
              }}
              className="text-xs"
            >
              <Settings className="w-3 h-3 mr-2" />
              Reset & Choose Type
            </Button>
          </div>
        </div>
        <Dashboard userName={userName} />
      </div>
    );
  }

  return <Dashboard userName={userName} />;
};

const Home = () => {
  return (
    <OnboardingProvider>
      <HomeContent />
    </OnboardingProvider>
  );
};

export default Home;
