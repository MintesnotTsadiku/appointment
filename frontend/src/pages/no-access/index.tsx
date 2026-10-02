import { useFrappeAuth } from 'frappe-react-sdk';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, LogOut, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/button';
import { StaffShell } from '@/components/staff-shell';
import { useSession } from '@/context/session';
import { useTranslation } from '@/lib/i18n';

const STEPS = ['staff.noAccess.step1', 'staff.noAccess.step2', 'staff.noAccess.step3'] as const;

export default function NoAccess() {
  const { session } = useSession();
  const { logout } = useFrappeAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const greeting = session?.full_name ? `${session.full_name}, ` : '';

  return (
    <StaffShell width="default">
      <section className="mx-auto flex max-w-xl flex-col items-center rounded-xl border bg-card px-6 py-10 text-center shadow-card sm:px-10">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning" aria-hidden="true">
          <ShieldAlert className="h-6 w-6" />
        </span>
        <h1 data-qa="no-access-heading" className="mt-4 font-heading text-2xl font-semibold tracking-tight">
          {t('staff.noAccess.title')}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {greeting}
          {t('staff.noAccess.description')}
        </p>

        <div className="mt-6 w-full rounded-lg border bg-muted/40 p-4 text-left">
          <h2 className="text-sm font-semibold">{t('staff.noAccess.nextSteps')}</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
            {STEPS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ol>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{t('staff.noAccess.notSetup')}</p>

        <div className="mt-6 flex w-full flex-col-reverse justify-center gap-2 sm:w-auto sm:flex-row">
          <Button variant="outline" onClick={() => void handleLogout()}>
            <LogOut className="h-4 w-4" aria-hidden="true" /> {t('staff.shell.signOut')}
          </Button>
          <Button asChild>
            <Link to="/">
              <CalendarClock className="h-4 w-4" aria-hidden="true" /> {t('staff.noAccess.browse')}
            </Link>
          </Button>
        </div>
      </section>
    </StaffShell>
  );
}
