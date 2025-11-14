import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';

interface OnboardingProgress {
  current_step: number;
  completed_steps: number[];
  onboarding_complete: boolean;
  completed_at?: string;
}

interface OnboardingContextType {
  progress: OnboardingProgress | null;
  loading: boolean;
  error: Error | null;
  updateProgress: (step: number) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refreshProgress: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);

  // Fetch onboarding progress
  const { data, error, isLoading, mutate } = useFrappeGetCall<{ message: OnboardingProgress }>(
    'frappe_appointment.onboarding.get_progress',
    undefined,
    undefined,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const { call: updateCall } = useFrappePostCall('frappe_appointment.onboarding.update_step');
  const { call: completeCall } = useFrappePostCall('frappe_appointment.onboarding.complete');

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

  return (
    <OnboardingContext.Provider
      value={{
        progress,
        loading: isLoading,
        error: error as Error | null,
        updateProgress,
        completeOnboarding,
        refreshProgress,
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

