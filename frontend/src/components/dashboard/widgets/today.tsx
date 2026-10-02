import { TodayAgenda } from '@/pages/home/today/TodayAgenda';
import { SetupProgress } from '@/pages/home/today/SetupProgress';
import { QuickActions } from '@/pages/home/today/QuickActions';
import type { WidgetContext } from '../types';

type Props = { ctx: WidgetContext };

export const TodayWidget = ({ ctx }: Props) => <TodayAgenda organization={ctx.organization} deskPath="/reception" />;
export const SetupWidget = ({ ctx }: Props) => <SetupProgress organization={ctx.organization} />;
export const QuickActionsWidget = () => <QuickActions />;
