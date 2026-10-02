import { useDroppable } from '@dnd-kit/core';
import { format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import type { TimeSlotInterval } from '../types';
import { pad, type Slot } from './layout';

interface TimeSlotProps {
  date: Date;
  slot: Slot;
  interval: TimeSlotInterval;
  heightPx: number;
  dragging: boolean;
  onCreate?: (date: Date, time: string) => void;
}

/** Drop target and click-to-book cell for one slot. */
export function TimeSlot({ date, slot, interval, heightPx, dragging, onCreate }: TimeSlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${format(date, 'yyyy-MM-dd')}-${slot.hour}-${slot.minute}` });
  const now = new Date();
  const isPast = isToday(date) && (slot.hour < now.getHours() || (slot.hour === now.getHours() && slot.minute < now.getMinutes()));
  const time = `${pad(slot.hour)}:${pad(slot.minute)}`;
  const showLabel = slot.minute === 0 || (interval <= 30 && slot.minute % 30 === 0);

  const create = () => {
    if (dragging || !onCreate) return;
    const slotDate = new Date(date);
    slotDate.setHours(slot.hour, slot.minute, 0, 0);
    onCreate(slotDate, time);
  };

  return (
    <div
      ref={setNodeRef}
      onClick={create}
      onDoubleClick={create}
      title={`Click to create appointment at ${time}`}
      style={{ height: `${heightPx}px` }}
      className={cn(
        'group relative cursor-pointer border-b border-border/60 transition-colors',
        isOver ? 'bg-primary/10' : isPast ? 'bg-muted/60' : 'hover:bg-muted/60',
        slot.minute === 0 && 'border-t border-t-border'
      )}
    >
      {showLabel && <span className="absolute left-2 top-1 text-[10px] font-medium tabular-nums text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">{time}</span>}
      {isOver && <div className="absolute inset-1 rounded-md border-2 border-dashed border-primary" />}
    </div>
  );
}
