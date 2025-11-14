import { useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { useTranslation } from '@/lib/i18n';
import { CheckCircle, Calendar, ArrowLeft } from 'lucide-react';

interface Step2CalendarProps {
  onNext: () => void;
  onBack: () => void;
}

const Step2Calendar = ({ onNext, onBack }: Step2CalendarProps) => {
  const { t } = useTranslation();
  const [selectedOption, setSelectedOption] = useState<'manual' | 'google' | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const { call, loading } = useFrappePostCall('frappe_appointment.onboarding.connect_calendar');

  const handleSelectManual = async () => {
    setSelectedOption('manual');
    try {
      await call({ provider: 'manual' });
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to set manual calendar:', error);
    }
  };

  const handleSelectGoogle = async () => {
    setSelectedOption('google');
    try {
      const result = await call({ provider: 'google' });
      if (result?.message?.oauth_url) {
        // Redirect to OAuth URL
        window.location.href = result.message.oauth_url;
      } else {
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Failed to initiate Google OAuth:', error);
    }
  };

  const handleContinue = () => {
    if (isConnected) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      {/* Options Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Option 1: Built-in Calendar */}
        <Card
          className={`p-8 cursor-pointer transition-all hover:shadow-lg ${
            selectedOption === 'manual'
              ? 'ring-2 ring-brand-primary border-brand-primary bg-indigo-50 dark:bg-indigo-900/20'
              : 'hover:border-brand-primary/50'
          }`}
          onClick={handleSelectManual}
        >
          <div className="text-center space-y-4">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-white" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('onboarding.step2.manualTitle') || 'Built-in Calendar'}
            </h3>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-400">
              {t('onboarding.step2.manualDescription') ||
                'No external setup required. Start booking immediately.'}
            </p>

            {/* Features */}
            <ul className="text-left space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>{t('onboarding.step2.feature1') || 'No configuration needed'}</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>{t('onboarding.step2.feature2') || 'Works offline'}</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>{t('onboarding.step2.feature3') || 'Simple and easy'}</span>
              </li>
            </ul>

            {/* Status */}
            {selectedOption === 'manual' && isConnected && (
              <div className="pt-4 border-t">
                <div className="inline-flex items-center space-x-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">{t('common.connected') || 'Connected'}</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Option 2: Google Calendar */}
        <Card
          className={`p-8 cursor-pointer transition-all hover:shadow-lg ${
            selectedOption === 'google'
              ? 'ring-2 ring-brand-primary border-brand-primary bg-indigo-50 dark:bg-indigo-900/20'
              : 'hover:border-brand-primary/50'
          }`}
          onClick={handleSelectGoogle}
        >
          <div className="text-center space-y-4">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center border-2 border-gray-200 dark:border-gray-600">
              <svg className="w-8 h-8" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('onboarding.step2.googleTitle') || 'Google Calendar'}
            </h3>

            {/* Description */}
            <p className="text-gray-600 dark:text-gray-400">
              {t('onboarding.step2.googleDescription') ||
                'Sync appointments with your Google Calendar automatically.'}
            </p>

            {/* Features */}
            <ul className="text-left space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>{t('onboarding.step2.googleFeature1') || 'Two-way sync'}</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>{t('onboarding.step2.googleFeature2') || 'Prevent double-booking'}</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>{t('onboarding.step2.googleFeature3') || 'Access anywhere'}</span>
              </li>
            </ul>

            {/* Status */}
            {selectedOption === 'google' && loading && (
              <div className="pt-4 border-t">
                <div className="inline-flex items-center space-x-2 text-brand-primary">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="font-medium">{t('common.connecting') || 'Connecting...'}</span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Help Text */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        {t('onboarding.step2.helpText') ||
          "Don't worry, you can change this later in settings"}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('common.back') || 'Back'}</span>
        </Button>

        <Button
          onClick={handleContinue}
          disabled={!isConnected || loading}
          className="bg-gradient-hero hover:opacity-90 text-white"
        >
          <span className="flex items-center space-x-2">
            <span>{t('common.continue') || 'Continue'}</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </Button>
      </div>
    </div>
  );
};

export default Step2Calendar;

