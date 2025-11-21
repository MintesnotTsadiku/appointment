import { cn } from "@/lib/utils";
import type { OnboardingProgress } from "@/context/onboarding/types";

const steps = [
  { id: 1, title: "Profile", description: "Tell us about your business" },
  { id: 2, title: "Calendar", description: "Connect Google or manual" },
  { id: 3, title: "Availability", description: "Set weekly hours" },
  { id: 4, title: "Service", description: "Create appointment types" },
  { id: 5, title: "Launch", description: "Share booking link" },
];

export const OnboardingProgressCard = ({ progress }: { progress: OnboardingProgress | null }) => {
  const currentStep = progress?.current_step || 1;
  const percent = Math.round((currentStep / steps.length) * 100);

  return (
    <div className="bg-white/90 dark:bg-gray-900/70 backdrop-blur rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Onboarding progress</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">Step {currentStep} of {steps.length}</p>
        </div>
        <div className="text-sm font-medium text-primary-600">{percent}% complete</div>
      </div>
      <div className="space-y-4">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-4">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center border text-sm font-semibold",
                step.id < currentStep
                  ? "bg-primary-600 text-white border-primary-600"
                  : step.id === currentStep
                  ? "border-primary-600 text-primary-600"
                  : "border-gray-200 text-gray-400"
              )}
            >
              {step.id}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{step.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
