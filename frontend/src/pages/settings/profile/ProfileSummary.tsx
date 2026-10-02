import { Building2, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { initialsOf } from './options';

interface ProfileSummaryProps {
  name: string;
  email: string;
  photo?: string;
  organizationName?: string;
  roleLabel?: string;
}

export function ProfileSummary({ name, email, photo, organizationName, roleLabel }: ProfileSummaryProps) {
  return (
    <div className="flex min-w-0 flex-col items-start gap-4 rounded-xl border bg-card p-5 shadow-card sm:flex-row sm:items-center">
      <Avatar className="h-16 w-16 shrink-0 text-lg">
        {photo && <AvatarImage src={photo} alt="" className="object-cover" />}
        <AvatarFallback className="bg-primary/10 font-semibold text-primary">{initialsOf(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="truncate text-base font-semibold text-foreground">{name}</h2>
          {roleLabel && <Badge variant="muted">{roleLabel}</Badge>}
        </div>
        {email && (
          <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{email}</span>
          </p>
        )}
        {organizationName && (
          <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{organizationName}</span>
          </p>
        )}
      </div>
    </div>
  );
}
