import { ExternalLink } from 'lucide-react';
import { Panel } from '@/components/analytics/Panels';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';

const LINKS = [
  { href: '/app', key: 'staff.admin.deskHome' },
  { href: '/app/organization', key: 'staff.admin.deskOrganizations' },
  { href: '/app/appointment', key: 'staff.admin.deskAppointments' },
  { href: '/app/user', key: 'staff.admin.deskUsers' },
] as const;

/** Full page loads: Desk is a separate app served by Frappe, not a SPA route. */
export function DeskLinks() {
  const { t } = useTranslation();
  return (
    <Panel title={t('staff.admin.deskTitle')} subtitle={t('staff.admin.deskSubtitle')} qa="admin-desk-links">
      <div className="flex flex-wrap gap-2">
        {LINKS.map((link) => (
          <Button key={link.href} asChild variant="outline" size="sm">
            <a href={link.href}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              {t(link.key)}
            </a>
          </Button>
        ))}
      </div>
    </Panel>
  );
}
