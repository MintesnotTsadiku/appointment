import type { TimeSlotInterval } from '../types';
import { HEADER_PX, pad, type Slot } from './layout';

/** Hour labels down the left edge of the grid. */
export function TimeGutter({ slots, interval, slotPx, className = 'w-14' }: { slots: Slot[]; interval: TimeSlotInterval; slotPx: number; className?: string }) {
  return (
    <div className={`${className} shrink-0 border-r bg-card`} aria-hidden="true">
      <div className="border-b" style={{ height: HEADER_PX }} />
      {slots
        .filter((slot) => slot.minute === 0)
        .map((slot) => (
          <div key={slot.hour} className="flex items-start justify-end pr-2 pt-1" style={{ height: `${slotPx * (60 / interval)}px` }}>
            <span className="-mt-2.5 text-[11px] font-medium tabular-nums text-muted-foreground">{pad(slot.hour)}:00</span>
          </div>
        ))}
    </div>
  );
}
