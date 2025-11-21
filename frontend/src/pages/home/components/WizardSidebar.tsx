import { CheckCircle2, Calendar, Clock3, Users } from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const progressSteps = [
  { id: 1, label: "Profile" },
  { id: 2, label: "Calendar" },
  { id: 3, label: "Availability" },
  { id: 4, label: "Service" },
  { id: 5, label: "Launch" },
];

const orgHighlights = [
  {
    icon: Users,
    title: "You’re setting up for a team",
    description: "Add providers, share booking pages, and keep everyone in sync.",
  },
  {
    icon: Clock3,
    title: "Business hours sync automatically",
    description: "Whatever you configure here reflects instantly on the booking UI.",
  },
  {
    icon: Calendar,
    title: "Keep it consistent",
    description: "The new Date & Time selector inherits your branding and preferences.",
  },
];

const individualHighlights = [
  {
    icon: Calendar,
    title: "Ready in minutes",
    description: "We’ll create your personal booking page with minimal setup.",
  },
  {
    icon: CheckCircle2,
    title: "Guided steps",
    description: "Each card uses the latest UI components your clients see.",
  },
  {
    icon: Clock3,
    title: "Smart availability",
    description: "Templates (9-5, 24h, weekend only) mirror the booking filters.",
  },
];

export const WizardSidebar = ({
  currentStep,
  isOrganization,
}: {
  currentStep: number;
  isOrganization: boolean;
}) => {
  const highlights = isOrganization ? orgHighlights : individualHighlights;
  const percent = Math.round((currentStep / progressSteps.length) * 100);

  return (
    <aside className="space-y-6">
      <div className="bg-white/80 dark:bg-white/10 backdrop-blur border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-lg">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-300">Onboarding</p>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
            Ethiopian Scheduler
          </h1>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
            <span className="font-semibold text-gray-900 dark:text-white">Step {currentStep}</span>
            <span>{percent}% complete</span>
          </div>
        <div className="mt-3 flex gap-2">
          {progressSteps.map((step) => {
            const isComplete = step.id <= currentStep;
            const style: CSSProperties = {
              backgroundColor: isComplete
                ? 'var(--brand-primary, #3B82F6)'
                : 'var(--onboarding-progress-inactive, rgba(148,163,184,0.45))',
            };

            return (
              <span
                key={step.id}
                className="h-2 flex-1 rounded-full block transition-all shadow-inner"
                style={style}
              />
            );
          })}
        </div>
        </div>
        <div className="mt-6 text-sm text-gray-600 dark:text-gray-300">
          <p>• 5 guided steps</p>
          <p>• Auto-saves between steps</p>
          <p>• Preview changes instantly</p>
        </div>
      </div>

      <div className="space-y-4">
        {highlights.map((card) => (
          <div
            key={card.title}
            className="p-4 bg-white/80 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl flex items-start gap-3"
          >
            <div className="h-10 w-10 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-200 flex items-center justify-center">
              <card.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{card.title}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{card.description}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
