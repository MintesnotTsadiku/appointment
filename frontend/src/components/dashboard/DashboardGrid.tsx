import type React from 'react';
import ReactGridLayout, { useContainerWidth, type Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { WIDGET_BY_ID } from './registry';
import { WidgetFrame, type WidgetActions } from './WidgetFrame';
import type { LayoutEntry, WidgetContext } from './types';

const GRID_MIN_WIDTH = 768;

interface DashboardGridProps {
  layout: LayoutEntry[];
  editing: boolean;
  ctx: WidgetContext;
  onLayoutChange: (layout: LayoutEntry[]) => void;
  actionsFor: (id: string) => WidgetActions;
}

/** 12-column drag/resize grid on wide screens; a single stacked column on phones. */
export function DashboardGrid({ layout, editing, ctx, onLayoutChange, actionsFor }: DashboardGridProps) {
  const { width, containerRef, mounted } = useContainerWidth();
  const stacked = mounted && width < GRID_MIN_WIDTH;
  const items = layout.filter((item) => WIDGET_BY_ID.has(item.i));

  return (
    <div ref={containerRef as React.RefObject<HTMLDivElement>} data-qa="workspace-analytics" data-editing={editing || undefined} className="staff-dashboard min-w-0">
      {mounted && stacked && (
        <div className="grid grid-cols-2 gap-3">
          {[...items].sort((a, b) => a.y - b.y || a.x - b.x).map((item) => {
            const widget = WIDGET_BY_ID.get(item.i)!;
            // Headline cards pair up on phones so more fits above the fold.
            const half = item.w <= 3 && item.h <= 3;
            return (
              <div key={item.i} className={half ? 'col-span-1 min-w-0' : 'col-span-2 min-w-0'}>
                <WidgetFrame widget={widget} editing={editing} actions={actionsFor(item.i)} fill={false}>
                  <widget.Body ctx={ctx} />
                </WidgetFrame>
              </div>
            );
          })}
        </div>
      )}
      {mounted && !stacked && (
        <ReactGridLayout
          width={width}
          layout={items.map((item) => ({ ...item, minW: WIDGET_BY_ID.get(item.i)?.minSize?.w, minH: WIDGET_BY_ID.get(item.i)?.minSize?.h }))}
          gridConfig={{ cols: 12, rowHeight: 32, margin: [12, 12], containerPadding: [0, 0] }}
          dragConfig={{ enabled: editing, handle: '.widget-drag-handle', threshold: 3 }}
          resizeConfig={{ enabled: editing, handles: ['se'] }}
          onLayoutChange={(next: Layout) => onLayoutChange(next.map(({ i, x, y, w, h }) => ({ i, x, y, w, h })))}
        >
          {items.map((item) => {
            const widget = WIDGET_BY_ID.get(item.i)!;
            return (
              <div key={item.i}>
                <WidgetFrame widget={widget} editing={editing} actions={actionsFor(item.i)}>
                  <widget.Body ctx={ctx} />
                </WidgetFrame>
              </div>
            );
          })}
        </ReactGridLayout>
      )}
    </div>
  );
}
