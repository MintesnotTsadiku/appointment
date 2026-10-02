import { useEffect, useState } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { toast } from 'sonner';
import { Plus, RefreshCw, UserRound } from 'lucide-react';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/states';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { WalkIn } from '../types';
import { WalkInCard } from './WalkInCard';

interface WalkInQueueProps {
  locationName: string | null;
  onAssignWalkIn: (walkInName: string) => void;
  onCreateWalkIn: () => void;
  refreshToken?: number;
}

export const WalkInQueue = ({ locationName, onAssignWalkIn, onCreateWalkIn, refreshToken = 0 }: WalkInQueueProps) => {
  const { t } = useTranslation();
  const [assigningWalkIn, setAssigningWalkIn] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: walkInsData, isLoading, error, mutate: refreshWalkIns } = useFrappeGetCall<{ message: { walk_ins: WalkIn[]; count: number } }>(
    'appointment.scheduler.api.desk.get_walk_ins',
    locationName ? { location_name: locationName } : undefined,
    `walk-ins-${locationName || 'all'}`,
    { revalidateOnFocus: true, refreshInterval: 30000 }
  );
  const { call: assignWalkIn } = useFrappePostCall('appointment.scheduler.api.desk.assign_walk_in_to_slot');
  const walkIns = walkInsData?.message?.walk_ins || [];

  useEffect(() => {
    if (refreshToken > 0) refreshWalkIns();
  }, [refreshToken, refreshWalkIns]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshWalkIns();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleAssign = async (walkInName: string) => {
    setAssigningWalkIn(walkInName);
    try {
      const walkIn = walkIns.find((w) => w.name === walkInName);
      if (!walkIn) {
        toast.error('Walk-in not found');
        return;
      }
      if (!walkIn.location) {
        toast.error('Walk-in needs a location');
        return;
      }
      const providerName = walkIn.provider_preferred || '';
      if (!providerName) {
        toast.error('Please select a provider');
        return;
      }
      const result = await assignWalkIn({ walk_in_name: walkInName, provider_name: providerName, location_name: walkIn.location });
      if (result?.message?.success) {
        toast.success('Walk-in assigned!', { description: 'Appointment created successfully' });
        refreshWalkIns();
        onAssignWalkIn(walkInName);
      } else {
        toast.error('Assignment failed', { description: result?.message?.error });
      }
    } catch (error) {
      toast.error('Assignment failed', { description: (error as { message?: string } | undefined)?.message });
    } finally {
      setAssigningWalkIn(null);
    }
  };

  return (
    <section aria-labelledby="walkin-queue-title" data-qa="walkin-queue" className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-card">
      <header className="space-y-3 border-b p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 id="walkin-queue-title" className="truncate text-base font-semibold text-foreground">
              {t('staff.receptionDesk.queueTitle')}
            </h2>
            <Badge variant="secondary" className="tabular-nums" aria-label={`${walkIns.length} ${t('staff.receptionDesk.waiting')}`}>
              {walkIns.length}
            </Badge>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} disabled={isRefreshing} aria-label={t('staff.receptionDesk.refreshQueue')}>
            <RefreshCw className={cn(isRefreshing && 'animate-spin')} />
          </Button>
        </div>
        <Button data-qa="reception-add-walkin" type="button" variant="outline" className="w-full" onClick={onCreateWalkIn}>
          <Plus aria-hidden="true" />
          {t('staff.receptionDesk.addWalkIn')}
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <QueueBody
          loading={isLoading}
          failed={Boolean(error) && walkIns.length === 0}
          onRetry={() => void refreshWalkIns()}
          walkIns={walkIns}
          assigning={assigningWalkIn}
          onAssign={handleAssign}
        />
      </div>

      <footer className="flex items-center justify-between border-t px-4 py-2.5 text-xs text-muted-foreground">
        <span>{t('staff.receptionDesk.autoRefresh')}</span>
        <span className="inline-flex items-center gap-1.5 text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          {t('staff.receptionDesk.live')}
        </span>
      </footer>
    </section>
  );
};

interface QueueBodyProps {
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  walkIns: WalkIn[];
  assigning: string | null;
  onAssign: (walkInName: string) => void;
}

function QueueBody({ loading, failed, onRetry, walkIns, assigning, onAssign }: QueueBodyProps) {
  const { t } = useTranslation();
  if (loading) return <ListSkeleton count={3} className="[&>*]:h-32" />;
  if (failed) return <ErrorState onRetry={onRetry} className="py-6" />;
  if (walkIns.length === 0) {
    return <EmptyState compact icon={UserRound} title={t('staff.receptionDesk.queueEmpty')} description={t('staff.receptionDesk.queueEmptyHint')} />;
  }
  return (
    <ul className="space-y-3">
      {walkIns.map((walkIn) => (
        <li key={walkIn.name}>
          <WalkInCard walkIn={walkIn} onAssign={onAssign} isAssigning={assigning === walkIn.name} />
        </li>
      ))}
    </ul>
  );
}
