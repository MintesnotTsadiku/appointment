import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Report } from '@/components/analytics/types';

export type DashboardPage = 'overview' | 'insights';

export type WidgetCategory = 'today' | 'bookings' | 'performance' | 'revenue' | 'team' | 'setup';

export interface WidgetContext {
  report: Report;
  period: number;
  organization: string;
  manager: boolean;
}

export interface WidgetSize {
  w: number;
  h: number;
}

export interface WidgetDefinition {
  id: string;
  category: WidgetCategory;
  icon: LucideIcon;
  /** Title and plain-language explanation; keys under staff.widgets.<id>. */
  titleKey: string;
  descriptionKey: string;
  size: WidgetSize;
  minSize?: WidgetSize;
  /** Owner/manager only (financial and setup data). */
  managerOnly?: boolean;
  /** Existing QA hooks live on the widget frame. */
  qa?: string;
  Body: ComponentType<{ ctx: WidgetContext }>;
}

export interface LayoutEntry {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SavedDashboard {
  /** Absent means "use the current default", so default improvements still reach the user. */
  items?: LayoutEntry[];
  period?: number;
}
