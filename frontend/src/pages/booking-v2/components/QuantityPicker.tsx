import { Minus, Plus } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

/** "How many" for services that let customers choose a party size or number of seats. */
export function QuantityPicker({ value, max, onChange }: { value: number; max: number; onChange: (value: number) => void }) {
  const { t } = useTranslation();
  const button = "flex h-10 w-10 items-center justify-center rounded-lg border transition-colors disabled:opacity-40";
  const style = { borderColor: "var(--border-default)", color: "var(--text-primary)", backgroundColor: "var(--bg-elevated)" };
  return (
    <div className="mx-auto mb-6 flex w-full max-w-7xl items-center justify-between gap-4 rounded-xl border px-4 py-3"
      style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }} data-qa="booking-quantity">
      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }} id="booking-quantity-label">{t("bookingPicker.howMany")}</span>
      <div className="flex items-center gap-3" role="group" aria-labelledby="booking-quantity-label">
        <button type="button" className={button} style={style} data-qa="booking-quantity-less" aria-label={t("bookingPicker.fewer")}
          disabled={value <= 1} onClick={() => onChange(Math.max(1, value - 1))}>
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <output className="w-8 text-center text-lg font-semibold tabular-nums" style={{ color: "var(--text-primary)" }} data-qa="booking-quantity-value" aria-live="polite">{value}</output>
        <button type="button" className={button} style={style} data-qa="booking-quantity-more" aria-label={t("bookingPicker.more")}
          disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
