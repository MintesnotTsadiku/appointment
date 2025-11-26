/**
 * Validation Badge Component
 * Shows validation status with appropriate icon and color
 */

import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface ValidationBadgeProps {
  status: 'complete' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
}

export const ValidationBadge = ({ status, size = 'md' }: ValidationBadgeProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const iconSize = sizeClasses[size];

  if (status === 'complete') {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400" title="Complete">
        <CheckCircle2 className={iconSize} />
        <span className="text-sm font-medium">Complete</span>
      </span>
    );
  }

  if (status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400" title="Warning">
        <AlertTriangle className={iconSize} />
        <span className="text-sm font-medium">Warning</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400" title="Error">
      <XCircle className={iconSize} />
      <span className="text-sm font-medium">Error</span>
    </span>
  );
};




