import { Landmark, ShieldCheck, Smartphone } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type PaymentMethod = "Bank transfer" | "Chapa";

export interface CheckoutQuote {
  required: boolean;
  currency: string;
  service_price: number;
  amount_due: number;
  balance_due: number;
  is_deposit: boolean;
  refund_policy: "Full Refund" | "Partial Refund" | "No Refund" | string;
  cancellation_window_hours: number;
  late_cancellation_fee: number;
  methods: PaymentMethod[];
  collector: "Business" | "Platform";
}

const money = (amount: number, currency: string) =>
  `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Amounts, refund terms and the payment method, shown before the customer confirms. */
export function PaymentSummary({ quote, method, onMethod }: { quote: CheckoutQuote; method: PaymentMethod | null; onMethod: (method: PaymentMethod) => void }) {
  const { t } = useTranslation();
  const refund =
    quote.refund_policy === "No Refund" ? t("payments.refundNone") : quote.refund_policy === "Partial Refund" ? t("payments.refundPartial") : t("payments.refundFull");

  if (!quote.methods.length) {
    return (
      <p data-qa="checkout-unavailable" role="alert" className="mx-auto mb-6 max-w-3xl rounded-xl border p-4 text-sm" style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}>
        {t("payments.unavailable")}
      </p>
    );
  }

  return (
    <section data-qa="checkout-payment" className="mx-auto mb-6 max-w-3xl space-y-4 rounded-2xl border p-5" style={{ borderColor: "var(--border-default)", backgroundColor: "var(--bg-elevated)" }}>
      <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{t("payments.title")}</h2>
      <dl className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
        {quote.is_deposit && (
          <div className="flex justify-between gap-4">
            <dt>{t("payments.servicePrice")}</dt>
            <dd className="tabular-nums">{money(quote.service_price, quote.currency)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4 text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          <dt>{t("payments.dueNow")}</dt>
          <dd data-qa="checkout-amount-due" className="tabular-nums">{money(quote.amount_due, quote.currency)}</dd>
        </div>
        {quote.balance_due > 0 && (
          <div className="flex justify-between gap-4">
            <dt>{t("payments.balance")}</dt>
            <dd className="tabular-nums">{money(quote.balance_due, quote.currency)}</dd>
          </div>
        )}
      </dl>
      <div data-qa="checkout-refund" className="flex gap-2 rounded-xl p-3 text-sm" style={{ backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" style={{ color: "var(--accent-primary)" }} />
        <div>
          <p className="font-medium" style={{ color: "var(--text-primary)" }}>{t("payments.refundTitle")}</p>
          <p>{refund}</p>
          {quote.cancellation_window_hours > 0 && quote.late_cancellation_fee > 0 && (
            <p>{t("payments.lateFee").replace("{0}", String(quote.cancellation_window_hours)).replace("{1}", money(quote.late_cancellation_fee, quote.currency))}</p>
          )}
        </div>
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t("payments.method")}</legend>
        {quote.methods.map((option) => (
          <label
            key={option}
            className={cn("flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm", method === option && "ring-2 ring-[var(--accent-primary)]")}
            style={{ borderColor: "var(--border-default)", color: "var(--text-primary)" }}
          >
            <input
              type="radio"
              name="payment-method"
              data-qa={option === "Chapa" ? "checkout-method-chapa" : "checkout-method-bank"}
              className="mt-1"
              checked={method === option}
              onChange={() => onMethod(option)}
            />
            {option === "Chapa" ? <Smartphone className="mt-0.5 h-4 w-4" aria-hidden="true" /> : <Landmark className="mt-0.5 h-4 w-4" aria-hidden="true" />}
            <span>
              <span className="block font-medium">{option === "Chapa" ? t("payments.chapa") : t("payments.bank")}</span>
              <span className="block text-xs" style={{ color: "var(--text-secondary)" }}>{option === "Chapa" ? t("payments.chapaHint") : t("payments.bankHint")}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}
