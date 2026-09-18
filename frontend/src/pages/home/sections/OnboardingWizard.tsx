import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOnboarding } from '@/context/onboarding';
import { Button } from '@/components/button';
import { WizardSidebar } from '../components/WizardSidebar';

// Individual Provider Steps
import Step1Profile from '../components/Step1Profile';
import Step2Calendar from '../components/Step2Calendar';
import Step3Availability from '../components/Step3Availability';
import Step4Service from '../components/Step4Service';
import Step5Success from '../components/Step5Success';

// Organization Steps
import Step1OrgProfile from '../components/Step1OrgProfile';
import Step2OrgProviders from '../components/Step2OrgProviders';
import Step3OrgAvailability from '../components/Step3OrgAvailability';
import Step4OrgService from '../components/Step4OrgService';
import Step5OrgSuccess from '../components/Step5OrgSuccess';

const totalSteps = 5;
const gradientBackground =
  "min-h-screen bg-[radial-gradient(circle_at_top,_#f5f7ff,_#ffffff_45%,_#ffffff)] dark:bg-[radial-gradient(circle_at_top,_#020617,_#0f172a_45%,_#020617)]";

const getStepDescription = (isOrganization: boolean, currentStep: number) => {
  if (isOrganization) {
    switch (currentStep) {
      case 1:
        return 'Tell us about your organization';
      case 2:
        return 'Add team members who will provide services';
      case 3:
        return "Set your organization's operating hours";
      case 4:
        return 'Create services your organization offers';
      case 5:
        return 'Share your booking links with customers';
      default:
        return '';
    }
  }
  switch (currentStep) {
    case 1:
      return 'Tell us about your business';
    case 2:
      return 'Choose how to manage your calendar';
    case 3:
      return "Set when you're available for appointments";
    case 4:
      return 'Create your first service or appointment type';
    case 5:
      return 'Share your booking link with customers';
    default:
      return '';
  }
};

const OnboardingWizard = () => {
  const { progress, updateProgress, resetOnboardingType, refreshProgress } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(progress?.current_step || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOrganization = progress?.onboarding_type === 'organization';

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      setIsSubmitting(true);
      try {
        await updateProgress(currentStep + 1);
        setCurrentStep(currentStep + 1);
      } catch (error) {
        console.error('Failed to save progress:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    await handleNext();
  };

  const renderStep = () => {
    if (isOrganization) {
      switch (currentStep) {
        case 1:
          return <Step1OrgProfile onNext={handleNext} />;
        case 2:
          return <Step2OrgProviders onNext={handleNext} onBack={handleBack} />;
        case 3:
          return <Step3OrgAvailability onNext={handleNext} onBack={handleBack} />;
        case 4:
          return <Step4OrgService onNext={handleNext} onBack={handleBack} />;
        case 5:
          return <Step5OrgSuccess onComplete={() => window.location.reload()} />;
        default:
          return <Step1OrgProfile onNext={handleNext} />;
      }
    }

    switch (currentStep) {
      case 1:
        return <Step1Profile onNext={handleNext} />;
      case 2:
        return <Step2Calendar onNext={handleNext} onBack={handleBack} />;
      case 3:
        return <Step3Availability onNext={handleNext} onBack={handleBack} />;
      case 4:
        return <Step4Service onNext={handleNext} onBack={handleBack} />;
      case 5:
        return <Step5Success />;
      default:
        return <Step1Profile onNext={handleNext} />;
    }
  };

  const stepTitles = isOrganization
    ? [
        'Organization Profile',
        'Add Providers',
        'Business Hours',
        'Create Service',
        'Get Booking Links',
      ]
    : [
        'Business Profile',
        'Connect Calendar',
        'Set Availability',
        'Create Service',
        'Get Booking Link',
      ];

  return (
    <div data-qa="app-shell" data-qa-state="onboarding-wizard" className={gradientBackground}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 lg:grid lg:grid-cols-[360px,1fr] lg:gap-10 space-y-8 lg:space-y-0">
        <WizardSidebar currentStep={currentStep} isOrganization={isOrganization} />

        <div className="flex flex-col gap-6">
          <div className="text-left space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Guided onboarding</p>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
              {stepTitles[currentStep - 1]}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-3xl">
              {getStepDescription(isOrganization, currentStep)}
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`step-${currentStep}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-gray-900/80 backdrop-blur rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8"
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Step {currentStep} of {totalSteps}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (confirm('Change onboarding type? You will return to the selection screen.')) {
                    await resetOnboardingType();
                    refreshProgress();
                    window.location.reload();
                  }
                }}
              >
                Change type
              </Button>
              {currentStep > 1 && (
                <Button variant="ghost" onClick={handleBack} disabled={isSubmitting}>
                  Back
                </Button>
              )}
              {currentStep < totalSteps && (
                <>
                  <Button variant="ghost" onClick={handleSkip} disabled={isSubmitting}>
                    Skip for now
                  </Button>
                  <Button onClick={handleNext} disabled={isSubmitting}>
                    Continue
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
