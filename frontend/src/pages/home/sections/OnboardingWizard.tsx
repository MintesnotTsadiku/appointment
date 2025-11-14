import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOnboarding } from '@/context/onboarding';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import Step1Profile from '../components/Step1Profile';
import Step2Calendar from '../components/Step2Calendar';
import Step3Availability from '../components/Step3Availability';
import Step4Service from '../components/Step4Service';
import Step5Success from '../components/Step5Success';

const OnboardingWizard = () => {
  const { t } = useTranslation();
  const { progress, updateProgress } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(progress?.current_step || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 5;

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

  const stepTitles = [
    'Business Profile',
    'Connect Calendar',
    'Set Availability',
    'Create Service',
    'Get Booking Link',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-gray-900">
      {/* Animated Background Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
        className="absolute top-0 -left-1/4 w-96 h-96 bg-gradient-hero opacity-20 rounded-full blur-3xl"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [90, 0, 90],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'linear',
        }}
        className="absolute bottom-0 -right-1/4 w-96 h-96 bg-gradient-feature opacity-20 rounded-full blur-3xl"
      />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-hero rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">📅</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Ethiopian Scheduler
              </h1>
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Step {currentStep} of {totalSteps}
              </span>
              <div className="flex space-x-1">
                {Array.from({ length: totalSteps }).map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index + 1 <= currentStep
                        ? 'bg-gradient-hero'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Step Content */}
        <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
          <div className="w-full max-w-3xl">
            {/* Step Title */}
            <motion.div
              key={`title-${currentStep}`}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-center mb-8"
            >
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
                {stepTitles[currentStep - 1]}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                {currentStep === 1 && 'Tell us about your business'}
                {currentStep === 2 && 'Choose how to manage your calendar'}
                {currentStep === 3 && 'Set when you\'re available for appointments'}
                {currentStep === 4 && 'Create your first service or appointment type'}
                {currentStep === 5 && 'Share your booking link with customers'}
              </p>
            </motion.div>

            {/* Step Component */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>

            {/* Skip Button for power users (except last step) */}
            {currentStep < totalSteps && (
              <div className="text-center mt-6">
                <button
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center text-sm text-gray-500 dark:text-gray-400">
            Need help? Contact support@ethiopianscheduler.com
          </div>
        </footer>
      </div>
    </div>
  );
};

export default OnboardingWizard;

