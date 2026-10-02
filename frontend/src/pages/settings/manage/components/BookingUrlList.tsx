import { ExternalLink } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import type { BookingUrl } from '../types';

/** Public booking links for an organization or provider. */
export const BookingUrlList = ({ urls, showType = false }: { urls?: BookingUrl[]; showType?: boolean }) => {
  const { t } = useTranslation();
  if (!urls?.length) return null;
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{t('staff.manage.bookingUrls')}</p>
      <ul className="space-y-1">
        {urls.map((url, idx) => (
          <li key={idx} className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm">
            <a
              href={url.full_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-w-0 items-center gap-1 rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="break-all">{url.description || url.url_type || url.full_url}</span>
            </a>
            {showType && <span className="text-xs text-muted-foreground">({url.url_type})</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};
