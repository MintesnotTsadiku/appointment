import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface StepLayoutProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export const StepLayout = ({ icon: Icon, title, description, children, footer }: StepLayoutProps) => {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-200 flex items-center justify-center">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm uppercase tracking-wide text-gray-500">Guided step</p>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
        </div>
      </div>
      <div className="space-y-6">{children}</div>
      {footer}
    </div>
  );
};
