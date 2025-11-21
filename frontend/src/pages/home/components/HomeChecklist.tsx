import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

const checklistItems = [
  "Profile completed",
  "Calendar connected",
  "Availability published",
  "Service activated",
  "Booking page shared",
];

export const HomeChecklist = () => {
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
        {checklistItems.map((item, index) => (
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
