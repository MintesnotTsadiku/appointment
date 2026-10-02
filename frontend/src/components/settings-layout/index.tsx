import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/button';
import { StaffShell, type StaffShellProps } from '@/components/staff-shell';

interface SettingsPageProps extends Omit<StaffShellProps, 'breadcrumbs' | 'title'> {
  title: ReactNode;
  /** Plain-text crumb label; defaults to the title when it is a string. */
  crumb?: string;
}

/** StaffShell preset for /settings/* pages: breadcrumb back to Settings and a narrower column. */
export function SettingsPage({ title, crumb, width = 'default', ...props }: SettingsPageProps) {
  const { t } = useTranslation();
  const label = crumb ?? (typeof title === 'string' ? title : '');
  return (
    <StaffShell
      {...props}
      width={width}
      title={title}
      breadcrumbs={[{ label: t('staff.nav.settings'), to: '/settings' }, { label }]}
    />
  );
}

export function SettingsSection({ title, description, children, className, aside, id }: { title: ReactNode; description?: ReactNode; children: ReactNode; className?: string; aside?: ReactNode; id?: string }) {
  return (
    <section id={id} className={cn('rounded-xl border bg-card text-card-foreground shadow-card', className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {aside}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

interface SaveBarProps {
  dirty?: boolean;
  saving?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
  saveLabel?: string;
  /** Rendered as a form submit button when no onSave is provided. */
  form?: string;
  saveQa?: string;
  disabled?: boolean;
  message?: ReactNode;
}

/** Sticky footer for long settings forms; shows unsaved-change state. */
export function StickySaveBar({ dirty = true, saving, onSave, onDiscard, saveLabel, form, saveQa, disabled, message }: SaveBarProps) {
  const { t } = useTranslation();
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <p className="mr-auto text-sm text-muted-foreground" aria-live="polite">
          {message ?? (dirty ? t('staff.form.unsaved') : t('staff.form.allSaved'))}
        </p>
        {onDiscard && dirty && (
          <Button type="button" variant="ghost" onClick={onDiscard} disabled={saving}>
            {t('staff.form.discard')}
          </Button>
        )}
        <Button type={onSave ? 'button' : 'submit'} form={form} onClick={onSave} disabled={disabled || saving} data-qa={saveQa}>
          {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
          {saving ? t('staff.form.saving') : saveLabel ?? t('staff.form.save')}
        </Button>
      </div>
    </div>
  );
}

export function FieldHint({ children, error, id }: { children: ReactNode; error?: boolean; id?: string }) {
  return (
    <p id={id} role={error ? 'alert' : undefined} className={cn('mt-1.5 text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
      {children}
    </p>
  );
}
