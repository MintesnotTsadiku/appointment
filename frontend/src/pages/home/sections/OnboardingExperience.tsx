import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import type { OnboardingProgress } from "@/context/onboarding/types";

const progressSteps = [
  { id: 1, title: "Profile", description: "Tell us about your business" },
  { id: 2, title: "Calendar", description: "Connect Google or manual" },
  { id: 3, title: "Availability", description: "Set weekly hours" },
  { id: 4, title: "Service", description: "Create appointment types" },
  { id: 5, title: "Launch", description: "Share booking link" },
];

const Checklist = () => {
  const items = [
    "Profile completed",
    "Calendar connected",
    "Availability published",
    "Service activated",
    "Booking page shared",
  ];

  return (
    <div className="bg-white dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="text-primary-600" />
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Setup checklist</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">4/5 complete</p>
        </div>
      </div>
      <ul className="space-y-3">
        {items.map((item, index) => (
          <li key={item} className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-full border",
                index < 4
                  ? "bg-primary-50 text-primary-600 border-primary-100"
                  : "border-dashed border-gray-300 text-gray-400"
              )}
            >
              {index < 4 ? "✓" : index + 1}
            </span>
            <span
              className={cn(
                "text-sm",
                index < 4 ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
              )}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const ProgressTimeline = ({ step }: { step: number }) => {
  return (
    <div className="bg-white/90 dark:bg-gray-900/70 backdrop-blur rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Onboarding progress</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">Step {step} of 5</p>
        </div>
        <div className="text-sm font-medium text-primary-600">{Math.round((step / 5) * 100)}% complete</div>
      </div>
      <div className="space-y-4">
        {progressSteps.map((progressStep) => (
          <div key={progressStep.id} className="flex items-center gap-4">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center border text-sm font-semibold",
                progressStep.id < step
                  ? "bg-primary-600 text-white border-primary-600"
                  : progressStep.id === step
                  ? "border-primary-600 text-primary-600"
                  : "border-gray-200 text-gray-400"
              )}
            >
              {progressStep.id}
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{progressStep.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{progressStep.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const FeatureGrid = () => {
  const features = useMemo(
    () => [
      {
        title: "Booking Experience",
        description: "The modern Date & Time selector your customers already love.",
      },
      {
        title: "Multi-Provider",
        description: "Easily onboard your entire clinic and switch between providers.",
      },
      {
        title: "Smart Availability",
        description: "Quick templates (+24h Mon-Sat) keep setup under 5 minutes.",
      },
      {
        title: "Actionable Dashboard",
        description: "Monitor bookings, revenue and next steps in one place.",
      },
    ],
    []
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {features.map((feature) => (
        <div
          key={feature.title}
          className="bg-white dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 flex items-start gap-4 shadow-lg"
        >
          <div className="h-12 w-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center">
            •
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const OnboardingExperience = ({
  progress,
  onContinue,
  onViewBooking,
}: {
  progress: OnboardingProgress | null;
  onContinue: () => void;
  onViewBooking: () => void;
}) => {
  const currentStep = progress?.current_step || 1;

  return (
    <div className="space-y-16">
      <section className="grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            Setup experience
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
            Finish onboarding in under 10 minutes and unlock the modern booking experience.
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mt-4">
            This layout reuses the same visual language as the Date & Time selector so your team enjoys a consistent suite from onboarding to booking.
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            <Button size="lg" onClick={onContinue}>
              Continue setup
            </Button>
            <Button variant="outline" size="lg" onClick={onViewBooking}>
              View booking page
            </Button>
          </div>
          <div className="flex gap-6 mt-8 text-sm text-gray-600 dark:text-gray-300">
            <div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">92%</p>
              <p>Complete onboarding in 10 min</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">48 hrs</p>
              <p>Average time to first booking</p>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <ProgressTimeline step={currentStep} />
          <Checklist />
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">Why the redesign</p>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">A cohesive system from setup to booking</h2>
          </div>
          <Button variant="ghost">See full spec →</Button>
        </div>
        <FeatureGrid />
      </section>
    </div>
  );
};

export default OnboardingExperience;
