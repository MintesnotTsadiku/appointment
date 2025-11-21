import { useState } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { Button } from '@/components/button';
import { CheckCircle, Calendar as CalendarIcon, ArrowLeft } from 'lucide-react';
import { StepLayout } from './StepLayout';

interface Step2CalendarProps {
  onNext: () => void;
  onBack: () => void;
}

const Step2Calendar = ({ onNext, onBack }: Step2CalendarProps) => {
  const [selectedOption, setSelectedOption] = useState<'manual' | 'google' | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const { call, loading } = useFrappePostCall('frappe_appointment.onboarding.connect_calendar');
  
  const handleConnect = async (calendar_provider: 'manual' | 'google') => {
    setSelectedOption(calendar_provider);
    try {
      const result = await call({ calendar_provider });
      setIsConnected(true);
      if (calendar_provider === 'google' && result?.message?.oauth_url) {
        window.location.href = result.message.oauth_url;
      }
    } catch (error) {
      console.error(`Failed to connect ${calendar_provider} calendar:`, error);
    }
  };

  const handleContinue = () => onNext();
  const handleSkip = () => onNext();

  const OptionCard = ({
    title,
    description,
    bullets,
    selected,
    onClick,
    icon,
    status,
  }: {
    title: string;
    description: string;
    bullets: string[];
    selected: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    status?: React.ReactNode;
  }) => (
    <div
      className={`p-8 rounded-2xl border transition-all hover:shadow-lg cursor-pointer ${
        selected ? 'border-brand-primary shadow-lg' : 'border-gray-200 dark:border-gray-800'
      }`}
      onClick={onClick}
    >
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-primary-50 dark:bg-primary-500/20 text-primary-600 dark:text-primary-300">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-gray-600 dark:text-gray-300">{description}</p>
        <ul className="text-left space-y-2 text-sm text-gray-600 dark:text-gray-400">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
        {status && <div className="pt-4 border-t border-gray-200 dark:border-gray-800">{status}</div>}
      </div>
    </div>
  );

  return (
    <StepLayout
      icon={CalendarIcon}
      title="Connect Calendar"
      description="Choose how you want to manage your availability"
      footer={
        <div className="flex items-center justify-between pt-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Button onClick={handleContinue} disabled={!selectedOption && !isConnected}>
            Continue
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <OptionCard
            title="Built-in Calendar"
            description="No external setup required. Start booking immediately."
            bullets={['No configuration needed', 'Works offline', 'Simple and easy']}
            selected={selectedOption === 'manual'}
            onClick={() => handleConnect('manual')}
            icon={<CalendarIcon className="h-7 w-7" />}
            status={
              selectedOption === 'manual' && isConnected && (
                <div className="inline-flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-5 h-5" /> Connected
                </div>
              )
            }
          />
          <OptionCard
            title="Google Calendar"
            description="Sync appointments with your Google Calendar automatically."
            bullets={['Two-way sync', 'Prevent double-booking', 'Access anywhere']}
            selected={selectedOption === 'google'}
            onClick={() => handleConnect('google')}
            icon={
              <svg className="w-7 h-7" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            }
            status={
              selectedOption === 'google' && loading && (
                <div className="inline-flex items-center gap-2 text-brand-primary">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </div>
              )
            }
          />
        </div>
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Don’t worry, you can change this later in settings
        </div>
        <div className="text-center pt-4">
          <button
            onClick={handleSkip}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            Skip for now
          </button>
        </div>
      </div>
    </StepLayout>
  );
};

export default Step2Calendar;
