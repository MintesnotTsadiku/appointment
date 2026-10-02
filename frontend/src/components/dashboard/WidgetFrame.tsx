import { forwardRef, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, GripVertical, Info, MoreHorizontal, Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu';
import type { WidgetDefinition } from './types';

export const WIDTH_PRESETS = [3, 4, 6, 8, 12] as const;

export interface WidgetActions {
  onRemove: () => void;
  onWidth: (w: number) => void;
  onMove: (direction: -1 | 1) => void;
}

interface WidgetFrameProps {
  widget: WidgetDefinition;
  editing: boolean;
  actions: WidgetActions;
  /** Fill the grid cell; off in the stacked mobile list. */
  fill?: boolean;
  children: ReactNode;
}

/** Card chrome shared by every widget: title, explanation, and edit controls. */
export const WidgetFrame = forwardRef<HTMLElement, WidgetFrameProps>(({ widget, editing, actions, fill = true, children }, ref) => {
  const { t } = useTranslation();
  const title = t(widget.titleKey);
  return (
    <section
      ref={ref}
      data-qa={widget.qa}
      data-widget={widget.id}
      aria-label={title}
      className={cn(
        'flex min-w-0 flex-col rounded-xl border bg-card text-card-foreground shadow-card',
        fill && 'h-full',
        editing && 'border-dashed border-primary/50 ring-1 ring-primary/10'
      )}
    >
      <header className="flex items-center gap-1.5 px-4 pb-2 pt-3">
        {editing && (
          <span className="widget-drag-handle -ml-1.5 hidden cursor-grab rounded p-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing md:inline-flex" aria-hidden="true">
            <GripVertical className="h-4 w-4" />
          </span>
        )}
        <h3 className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground" title={title}>{title}</h3>
        <WidgetInfo widget={widget} />
        {editing && <WidgetMenu widget={widget} actions={actions} />}
      </header>
      <div className={cn('min-h-0 px-4 pb-4', fill && 'flex-1 overflow-auto')}>{children}</div>
    </section>
  );
});
WidgetFrame.displayName = 'WidgetFrame';

function WidgetInfo({ widget }: { widget: WidgetDefinition }) {
  const { t } = useTranslation();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground" aria-label={`${t('staff.dashboard.about')}: ${t(widget.titleKey)}`}>
          <Info className="!size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 text-sm">
        <p className="font-medium text-foreground">{t(widget.titleKey)}</p>
        <p className="mt-1 text-muted-foreground">{t(widget.descriptionKey)}</p>
      </PopoverContent>
    </Popover>
  );
}

function WidgetMenu({ widget, actions }: { widget: WidgetDefinition; actions: WidgetActions }) {
  const { t } = useTranslation();
  const minW = widget.minSize?.w ?? 2;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" aria-label={`${t('staff.dashboard.widgetOptions')}: ${t(widget.titleKey)}`} data-qa="widget-menu">
          <MoreHorizontal className="!size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t('staff.dashboard.width')}</DropdownMenuLabel>
        {WIDTH_PRESETS.filter((w) => w >= minW).map((w) => (
          <DropdownMenuItem key={w} onSelect={() => actions.onWidth(w)}>
            {t(`staff.dashboard.widths.w${w}`)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => actions.onMove(-1)}>
          <ArrowUp />
          {t('staff.dashboard.moveEarlier')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onMove(1)}>
          <ArrowDown />
          {t('staff.dashboard.moveLater')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={actions.onRemove} className="text-destructive focus:text-destructive" data-qa="widget-remove">
          <Trash2 />
          {t('staff.dashboard.remove')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
