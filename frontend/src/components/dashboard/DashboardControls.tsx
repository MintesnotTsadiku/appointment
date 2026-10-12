import type { ReactNode } from 'react';
import { Check, HelpCircle, LayoutGrid, Loader2, Plus, RotateCcw, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/button';
import { OptionSelect } from '@/components/select/OptionSelect';

interface DashboardControlsProps {
  editing: boolean;
  saving: boolean;
  period: number;
  onPeriod: (period: number) => void;
  onGuide: () => void;
  onCustomize: () => void;
  onAdd: () => void;
  onReset: () => void;
  onCancel: () => void;
  onSave: () => void;
  /** Extra actions shown outside customize mode (e.g. export). */
  children?: ReactNode;
}

export function DashboardControls(props: DashboardControlsProps) {
  const { t } = useTranslation();
  if (props.editing) {
    return (
      <div className="flex flex-wrap items-center gap-2" data-qa="dashboard-edit-bar">
        <Button type="button" size="sm" variant="outline" className="h-9" onClick={props.onAdd} data-qa="dashboard-add">
          <Plus aria-hidden="true" />
          {t('staff.dashboard.addWidget')}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-9" onClick={props.onReset} data-qa="dashboard-reset">
          <RotateCcw aria-hidden="true" />
          {t('staff.dashboard.reset')}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-9" onClick={props.onCancel} data-qa="dashboard-cancel">
          <X aria-hidden="true" />
          {t('staff.form.cancel')}
        </Button>
        <Button type="button" size="sm" className="h-9" onClick={props.onSave} disabled={props.saving} data-qa="dashboard-save">
          {props.saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
          {t('staff.dashboard.saveLayout')}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="analytics-period">{t('staff.analytics.period')}</label>
      <OptionSelect id="analytics-period" data-qa="analytics-period" value={String(props.period)} onValueChange={(next) => props.onPeriod(Number(next))} className="h-9 w-36"
        options={[
          { value: '7', label: t('staff.analytics.last7') },
          { value: '30', label: t('staff.analytics.last30') },
          { value: '90', label: t('staff.analytics.last90') },
        ]} />
      {props.children}
      <Button type="button" size="sm" variant="ghost" className="h-9" onClick={props.onGuide} data-qa="dashboard-guide">
        <HelpCircle aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">{t('staff.dashboard.guide.button')}</span>
      </Button>
      <Button type="button" size="sm" variant="outline" className="h-9" onClick={props.onCustomize} data-qa="dashboard-customize">
        <LayoutGrid aria-hidden="true" />
        {t('staff.dashboard.customize')}
      </Button>
    </div>
  );
}
