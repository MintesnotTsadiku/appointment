import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { availableWidgets, defaultLayout, WIDGET_BY_ID } from './registry';
import { useDashboardLayout } from './useDashboardLayout';
import type { DashboardPage, LayoutEntry } from './types';

const COLS = 12;

/**
 * Layout state for one dashboard page. The saved layout is the baseline;
 * customizing edits a draft that is saved or discarded as a whole.
 */
export function useDashboard(page: DashboardPage, organization: string, manager: boolean) {
  const { t } = useTranslation();
  const store = useDashboardLayout(organization, page);
  const allowed = useMemo(() => availableWidgets(page, manager), [page, manager]);
  const baseline = useMemo(() => sanitize(store.saved?.items ?? defaultLayout(page, manager), allowed.map((w) => w.id)), [store.saved, page, manager, allowed]);
  const [draft, setDraft] = useState<LayoutEntry[] | null>(null);
  const [periodDraft, setPeriodDraft] = useState<number | null>(null);
  const editing = draft !== null;
  const layout = draft ?? baseline;
  const period = periodDraft ?? store.saved?.period ?? 30;

  const update = (next: LayoutEntry[]) => setDraft(next);
  const add = (id: string) => {
    const widget = WIDGET_BY_ID.get(id);
    if (!widget || layout.some((item) => item.i === id)) return;
    update([...layout, { i: id, x: 0, y: bottom(layout), ...widget.size }]);
  };

  return {
    loading: store.loading,
    saving: store.saving,
    editing,
    layout,
    allowed,
    period,
    setPeriod: setPeriodDraft,
    startEditing: () => setDraft(baseline),
    cancel: () => setDraft(null),
    setLayout: (next: LayoutEntry[]) => editing && update(next.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }))),
    add,
    remove: (id: string) => update(layout.filter((item) => item.i !== id)),
    setWidth: (id: string, w: number) =>
      update(layout.map((item) => (item.i === id ? { ...item, w, x: Math.min(item.x, COLS - w) } : item))),
    move: (id: string, direction: -1 | 1) => update(swapWithNeighbour(layout, id, direction)),
    reset: () => update(defaultLayout(page, manager)),
    save: async () => {
      try {
        await store.save({ items: sameLayout(layout, defaultLayout(page, manager)) ? undefined : layout, period });
        setDraft(null);
        toast.success(t('staff.dashboard.saved'));
      } catch {
        toast.error(t('staff.dashboard.saveFailed'));
      }
    },
    savePeriod: async (value: number) => {
      setPeriodDraft(value);
      if (!editing) await store.save({ items: store.saved?.items, period: value }).catch(() => undefined);
    },
  };
}

/** Drop unknown or forbidden widgets and duplicates from a stored layout. */
function sanitize(items: LayoutEntry[], allowed: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!allowed.includes(item.i) || seen.has(item.i)) return false;
    seen.add(item.i);
    return true;
  });
}

/** Reading order is top-to-bottom, left-to-right; swapping positions moves a widget one step. */
function swapWithNeighbour(layout: LayoutEntry[], id: string, direction: -1 | 1) {
  const ordered = [...layout].sort((a, b) => a.y - b.y || a.x - b.x);
  const index = ordered.findIndex((item) => item.i === id);
  const other = ordered[index + direction];
  if (index < 0 || !other) return layout;
  const current = ordered[index];
  return layout.map((item) => {
    if (item.i === current.i) return { ...item, x: Math.min(other.x, COLS - item.w), y: other.y };
    if (item.i === other.i) return { ...item, x: Math.min(current.x, COLS - item.w), y: current.y };
    return item;
  });
}

function sameLayout(a: LayoutEntry[], b: LayoutEntry[]) {
  const key = (items: LayoutEntry[]) => JSON.stringify([...items].sort((x, y) => x.i.localeCompare(y.i)).map(({ i, x, y, w, h }) => [i, x, y, w, h]));
  return key(a) === key(b);
}

function bottom(layout: LayoutEntry[]) {
  return layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
}
