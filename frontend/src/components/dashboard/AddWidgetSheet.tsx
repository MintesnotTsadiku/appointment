import { useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/sheet';
import type { WidgetCategory, WidgetDefinition } from './types';

const CATEGORIES: WidgetCategory[] = ['today', 'bookings', 'performance', 'revenue', 'team', 'setup'];

interface AddWidgetSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: WidgetDefinition[];
  placed: Set<string>;
  onAdd: (id: string) => void;
}

/** Catalog of widgets the role may add, grouped and searchable. */
export function AddWidgetSheet({ open, onOpenChange, widgets, placed, onAdd }: AddWidgetSheetProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const match = (widget: WidgetDefinition) => `${t(widget.titleKey)} ${t(widget.descriptionKey)}`.toLowerCase().includes(query.trim().toLowerCase());
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 p-0 sm:max-w-md" closeLabel={t('staff.shell.close')}>
        <SheetHeader className="border-b pb-4">
          <SheetTitle>{t('staff.dashboard.addTitle')}</SheetTitle>
          <SheetDescription>{t('staff.dashboard.addDescription')}</SheetDescription>
          <div className="relative pt-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('staff.dashboard.searchWidgets')} aria-label={t('staff.dashboard.searchWidgets')} className="pl-9" />
          </div>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
          {CATEGORIES.map((category) => {
            const rows = widgets.filter((widget) => widget.category === category && match(widget));
            if (!rows.length) return null;
            return (
              <section key={category} aria-labelledby={`widgets-${category}`}>
                <h3 id={`widgets-${category}`} className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t(`staff.dashboard.categories.${category}`)}</h3>
                <ul className="space-y-2">
                  {rows.map((widget) => (
                    <WidgetRow key={widget.id} widget={widget} added={placed.has(widget.id)} onAdd={() => onAdd(widget.id)} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function WidgetRow({ widget, added, onAdd }: { widget: WidgetDefinition; added: boolean; onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <li className="flex items-start gap-3 rounded-lg border p-3">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground" aria-hidden="true">
        <widget.icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{t(widget.titleKey)}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t(widget.descriptionKey)}</p>
      </div>
      <Button type="button" size="sm" variant={added ? 'ghost' : 'outline'} disabled={added} onClick={onAdd} aria-label={`${added ? t('staff.dashboard.added') : t('staff.dashboard.add')}: ${t(widget.titleKey)}`} data-qa={`add-widget-${widget.id}`}>
        {added ? <Check /> : <Plus />}
        {added ? t('staff.dashboard.added') : t('staff.dashboard.add')}
      </Button>
    </li>
  );
}
