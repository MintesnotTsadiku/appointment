import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Clock, Loader2, Mail, MapPin, Phone, User, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import type { WalkIn } from '../types';
import { PhoneText } from '@/components/phone-input';
import { phoneList } from '@/lib/phone';

interface WalkInCardProps {
  walkIn: WalkIn;
  onAssign: (walkInName: string) => void;
  isAssigning?: boolean;
}

export const WalkInCard = ({ walkIn, onAssign, isAssigning }: WalkInCardProps) => {
  const { t } = useTranslation();
  const waited = formatDistanceToNow(walkIn.creation ? new Date(walkIn.creation) : new Date(), { addSuffix: false });

  return (
    <article data-qa="walkin-card" data-qa-walkin-name={walkIn.name} data-internal-panel className="space-y-3 rounded-lg border bg-card p-3 shadow-xs">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{walkIn.client_name}</h3>
          {walkIn.service_requested && <p className="truncate text-xs text-muted-foreground">{walkIn.service_requested}</p>}
        </div>
        <Badge variant="warning" className="shrink-0 tabular-nums" title={t('staff.receptionDesk.waiting')}>
          <Clock aria-hidden="true" />
          {waited}
        </Badge>
      </header>

      <dl className="space-y-1 text-xs text-muted-foreground">
        {walkIn.client_phone && <Detail icon={Phone} label={t('staff.receptionDesk.phone')} value={<PhoneText value={walkIn.client_phone} />} />}
        {phoneList(walkIn.participant_phones).length > 0 && (
          <Detail icon={Users} label={t('controls.phone.peopleLabel')}
            value={<span data-qa="walkin-card-participants">{t('controls.phone.peopleCount').replace('{0}', String(phoneList(walkIn.participant_phones).length))}: {phoneList(walkIn.participant_phones).map((number, index) => <span key={number}>{index ? ', ' : ''}<PhoneText value={number} /></span>)}</span>} />
        )}
        {walkIn.client_email && <Detail icon={Mail} label={t('staff.receptionDesk.email')} value={walkIn.client_email} />}
        {walkIn.location_name && <Detail icon={MapPin} label={t('staff.receptionDesk.location')} value={walkIn.location_name} />}
        {walkIn.provider_preferred_name && <Detail icon={User} label={t('staff.receptionDesk.preferredProvider')} value={walkIn.provider_preferred_name} />}
      </dl>

      {walkIn.notes && <p className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">{walkIn.notes}</p>}

      <Button data-qa="walkin-assign" type="button" size="sm" className="w-full" onClick={() => onAssign(walkIn.name)} disabled={isAssigning}>
        {isAssigning ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {isAssigning ? t('staff.receptionDesk.assigning') : t('staff.receptionDesk.assign')}
        {!isAssigning && <ArrowRight aria-hidden="true" />}
      </Button>
    </article>
  );
};

function Detail({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <dt>
        <Icon className="h-3 w-3" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}
