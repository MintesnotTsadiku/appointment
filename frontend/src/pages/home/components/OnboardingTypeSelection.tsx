import { motion } from 'framer-motion';
import { Building2, User, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/button';

interface OnboardingTypeSelectionProps {
  onSelect: (type: 'individual' | 'organization') => void;
}

const gradientBackground =
  "min-h-screen bg-[radial-gradient(circle_at_top,_#f5f7ff,_#ffffff_45%,_#ffffff)] dark:bg-[radial-gradient(circle_at_top,_#020617,_#0f172a_45%,_#020617)]";

const Card = ({
  title,
  description,
  bullets,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  bullets: string[];
  icon: React.ReactNode;
  onClick: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all"
  >
    <div className="flex items-center gap-4">
      <div className="h-12 w-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
      </div>
    </div>
    <ul className="mt-6 space-y-3 text-sm text-gray-600 dark:text-gray-300">
      {bullets.map((bullet) => (
        <li key={bullet} className="flex items-start gap-2">
          <span className="text-primary-500">•</span>
          <span>{bullet}</span>
        </li>
      ))}
    </ul>
    <Button onClick={onClick} className="w-full mt-6">
      Continue
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  </motion.div>
);

export const OnboardingTypeSelection = ({ onSelect }: OnboardingTypeSelectionProps) => {
  return (
    <div data-qa="app-shell" data-qa-state="onboarding-type-selection" className={gradientBackground}>
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary-50 text-primary-700">
            <Building2 className="h-5 w-5" />
            Welcome to Ethiopian Scheduler
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
            Choose how you want to get started
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Pick the setup path that fits your workflow. You can switch anytime after onboarding.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card
            title="Individual Provider"
            description="I'm a solo practitioner managing my own appointments"
            bullets={[
              'Personal booking page with custom URL',
              'Manage your own calendar and availability',
              'Direct client bookings',
              'Invite assistants if needed',
            ]}
            icon={<User className="h-6 w-6" />}
            onClick={() => onSelect('individual')}
          />
          <Card
            title="Organization"
            description="I'm managing a business with multiple providers"
            bullets={[
              'Centralized business booking page',
              'Add and manage multiple providers',
              'Smart provider assignment',
              'Aggregated analytics and reporting',
            ]}
            icon={<Users className="h-6 w-6" />}
            onClick={() => onSelect('organization')}
          />
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Don’t worry, you can always change this later or add organizations to your account.
        </p>
      </div>
    </div>
  );
};
