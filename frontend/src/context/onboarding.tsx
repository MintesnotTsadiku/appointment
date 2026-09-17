import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useFrappeGetCall, useFrappePostCall, useFrappeAuth } from 'frappe-react-sdk';
import type { OnboardingProgress } from './onboarding/types';

interface OnboardingContextType {
  progress: OnboardingProgress | null;
  loading: boolean;
  error: Error | null;
  updateProgress: (step: number) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refreshProgress: () => void;
  setOnboardingType: (type: 'individual' | 'organization') => Promise<void>;
  resetOnboardingType: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const { currentUser, isLoading: authLoading } = useFrappeAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && (!currentUser || currentUser === 'Guest')) {
      // Redirect to our frontend login page with return URL
      const currentPath = window.location.pathname;
      window.location.href = `/login?redirect-to=${encodeURIComponent(currentPath)}`;
    }
  }, [currentUser, authLoading]);

  // Fetch onboarding progress
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: OnboardingProgress }>(
    'appointment.onboarding.get_progress',
    undefined,
    undefined,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const { call: updateCall } = useFrappePostCall('appointment.onboarding.update_step');
  const { call: completeCall } = useFrappePostCall('appointment.onboarding.complete');
  const { call: setTypeCall } = useFrappePostCall('appointment.onboarding.set_onboarding_type');
  const { call: resetTypeCall } = useFrappePostCall('appointment.onboarding.reset_onboarding_type');

  useEffect(() => {
    if (data?.message) {
      setProgress(data.message);
    }
  }, [data]);

  const updateProgress = async (step: number) => {
    try {
      const result = await updateCall({ step });
      if (result?.message) {
        setProgress(result.message);
      }
      mutate();
    } catch (err) {
      console.error('Failed to update progress:', err);
      throw err;
    }
  };

  const completeOnboarding = async () => {
    try {
      const result = await completeCall({});
      if (result?.message) {
        setProgress(result.message);
      }
      mutate();
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      throw err;
    }
  };

  const refreshProgress = () => {
    mutate();
  };

  const setOnboardingType = async (type: 'individual' | 'organization') => {
    try {
      const result = await setTypeCall({ onboarding_type: type });
      if (result?.message) {
        setProgress(result.message);
      }
      mutate();
    } catch (err) {
      console.error('Failed to set onboarding type:', err);
      throw err;
    }
  };

  const resetOnboardingType = async () => {
    try {
      const result = await resetTypeCall({});
      if (result?.message) {
        setProgress(result.message);
      }
      mutate();
    } catch (err) {
      console.error('Failed to reset onboarding type:', err);
      throw err;
    }
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <OnboardingContext.Provider
      value={{
        progress,
        loading: isLoading,
        error: error as Error | null,
        updateProgress,
        completeOnboarding,
        refreshProgress,
        setOnboardingType,
        resetOnboardingType,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
