import { CheckCircle2, CircleAlert, CircleDashed } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export interface ReadinessCheck {
  check: string;
  ok: boolean;
  remediation?: string | null;
}

const LABELS: Record<string, string> = {
  brand_published: "staff.publicExperience.checks.brand",
  locales: "staff.publicExperience.checks.locales",
  required_sections: "staff.publicExperience.checks.sections",
  primary_domain: "staff.publicExperience.checks.domain",
};

/** Human-readable go-live checklist; the custom domain is optional. */
export function Readiness({ checks }: { checks: ReadinessCheck[] }) {
  const { t } = useTranslation();
  return (
    <ul className="mt-4 space-y-2" data-qa="public-experience-checks">
      {checks.map((item) => {
        const optional = item.check === "primary_domain";
        const Icon = item.ok ? CheckCircle2 : optional ? CircleDashed : CircleAlert;
        return (
          <li key={item.check} className="flex items-start gap-2 text-sm">
            <Icon className={item.ok ? "mt-0.5 h-4 w-4 shrink-0 text-success" : optional ? "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" : "mt-0.5 h-4 w-4 shrink-0 text-warning"} aria-hidden="true" />
            <span className="min-w-0">
              <span className="text-foreground">{LABELS[item.check] ? t(LABELS[item.check]) : item.check}</span>
              <span className="sr-only">: {item.ok ? t("staff.home.setup.done") : t("staff.manage.validation.warning")}</span>
              {!item.ok && item.remediation ? <span className="block text-xs text-muted-foreground">{item.remediation}</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
