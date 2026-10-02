import { useTranslation } from '@/lib/i18n';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/sheet';
import { WIDGET_BY_ID } from './registry';
import type { DashboardPage, LayoutEntry, WidgetDefinition } from './types';

interface GuideSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page: DashboardPage;
  layout: LayoutEntry[];
}

/** Plain-language explanation of the page and every widget on it. */
export function GuideSheet({ open, onOpenChange, page, layout }: GuideSheetProps) {
  const { t } = useTranslation();
  const widgets = [...layout].sort((a, b) => a.y - b.y || a.x - b.x).map((item) => WIDGET_BY_ID.get(item.i)).filter((widget): widget is WidgetDefinition => Boolean(widget));
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 p-0 sm:max-w-md" closeLabel={t('staff.shell.close')}>
        <SheetHeader className="border-b pb-4">
          <SheetTitle>{t('staff.dashboard.guideTitle')}</SheetTitle>
          <SheetDescription>{t(`staff.dashboard.guide.${page}`)}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4 text-sm">
          <section>
            <h3 className="mb-2 font-semibold text-foreground">{t('staff.dashboard.guideCustomize')}</h3>
            <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>{t('staff.dashboard.steps.customize')}</li>
              <li>{t('staff.dashboard.steps.move')}</li>
              <li>{t('staff.dashboard.steps.resize')}</li>
              <li>{t('staff.dashboard.steps.add')}</li>
              <li>{t('staff.dashboard.steps.save')}</li>
            </ol>
          </section>
          <section>
            <h3 className="mb-2 font-semibold text-foreground">{t('staff.dashboard.guideWidgets')}</h3>
            <dl className="space-y-3">
              {widgets.map((widget) => (
                <div key={widget.id} className="flex gap-3">
                  <widget.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <dt className="font-medium text-foreground">{t(widget.titleKey)}</dt>
                    <dd className="text-muted-foreground">{t(widget.descriptionKey)}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
