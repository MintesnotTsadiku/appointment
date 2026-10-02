import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useSession } from '@/context/session';
import { useTranslation } from '@/lib/i18n';
import { StaffShell, settingsNav } from '@/components/staff-shell';

/** Settings hub: pages grouped by who they affect, filtered by role. */
const Settings = () => {
  const { session } = useSession();
  const { t } = useTranslation();
  const groups = settingsNav(session);

  return (
    <StaffShell title={t('staff.nav.settings')} description={t('staff.settings.hubDescription')} width="default">
      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.key} aria-labelledby={`settings-group-${group.key}`}>
            <h2 id={`settings-group-${group.key}`} className="mb-3 text-sm font-semibold text-foreground">
              {t(group.labelKey)}
            </h2>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {group.items.map((item) => (
                <li key={item.key}>
                  <Link
                    to={item.to}
                    data-qa={`settings-${item.key}`}
                    className="group flex h-full items-start gap-4 rounded-xl border bg-card p-4 shadow-card outline-none transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground" aria-hidden="true">
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">{t(item.labelKey)}</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">{t(item.descriptionKey)}</span>
                    </span>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </StaffShell>
  );
};

export default Settings;
