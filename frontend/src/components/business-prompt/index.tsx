import { useState } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { ArrowRight, Loader2, Store, X } from 'lucide-react';
import { Button } from '@/components/button';
import { useTranslation } from '@/lib/i18n';
import { usePlatformBrand } from '@/lib/platform-brand';
import {
  BUSINESS_PROMPT_API,
  isPromptDismissed,
  manageTokenFromPath,
  rememberPromptDismissed,
  safeLocalPath,
} from '@/lib/growth-touchpoints';
import { cn } from '@/lib/utils';

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * "Do you take appointments too?" after a successful booking.
 *
 * Shown when Growth Settings allow it, this browser has not closed it, and the server says the
 * booker is not staff and has no account yet. The button exchanges the booking's manage token for
 * a short-lived prefill token, so the sign-up page fills in the details without personal data in the URL.
 */
export function BusinessPrompt({ managePath, className }: { managePath?: string | null; className?: string }) {
  const { t } = useTranslation();
  const { growth, loaded } = usePlatformBrand();
  const token = manageTokenFromPath(managePath);
  const enabled = loaded && growth.customerBusinessPromptEnabled && Boolean(token);
  const [dismissed, setDismissed] = useState(() => isPromptDismissed(browserStorage()));
  const [starting, setStarting] = useState(false);
  const [failed, setFailed] = useState(false);
  const { data } = useFrappeGetCall<{ message: { show: boolean } }>(
    `${BUSINESS_PROMPT_API}.prompt`,
    { manage_token: token },
    enabled && !dismissed ? `business-prompt-${token}` : null,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const { call: createPrefill } = useFrappePostCall<{ message: { path: string } }>(`${BUSINESS_PROMPT_API}.create_prefill`);
  const show = enabled && !dismissed && Boolean(data?.message?.show);

  if (!show) return null;

  const dismiss = () => {
    rememberPromptDismissed(browserStorage());
    setDismissed(true);
  };

  const start = async () => {
    setStarting(true);
    setFailed(false);
    try {
      const path = safeLocalPath((await createPrefill({ manage_token: token }))?.message?.path);
      if (!path) throw new Error('prefill');
      window.location.assign(path);
    } catch {
      setFailed(true);
      setStarting(false);
    }
  };

  return (
    <aside
      data-qa="business-prompt"
      aria-labelledby="business-prompt-title"
      className={cn(
        'relative flex items-start gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/80 p-4 pr-12 text-left dark:border-gray-600 dark:bg-gray-800/60',
        className,
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-gray-700 shadow-xs ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-200 dark:ring-gray-700" aria-hidden="true">
        <Store className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p id="business-prompt-title" className="font-semibold text-gray-900 dark:text-gray-100">{t('growthTouchpoints.prompt.title')}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('growthTouchpoints.prompt.body')}</p>
        </div>
        <Button type="button" size="sm" data-qa="business-prompt-start" className="min-h-11 sm:min-h-9" onClick={() => void start()} disabled={starting}>
          {starting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {t('growthTouchpoints.prompt.start')}
          {!starting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </Button>
        {failed && <p role="alert" className="text-sm text-destructive">{t('growthTouchpoints.prompt.failed')}</p>}
      </div>
      <button
        type="button"
        data-qa="business-prompt-dismiss"
        onClick={dismiss}
        aria-label={t('growthTouchpoints.prompt.dismiss')}
        title={t('growthTouchpoints.prompt.dismiss')}
        className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200/70 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-gray-700 dark:hover:text-gray-100"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </aside>
  );
}

export default BusinessPrompt;
