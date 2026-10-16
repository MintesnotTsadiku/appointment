import {
  Camera,
  FileText,
  ChartNoAxesColumnIncreasing,
  Video,
  Info,
} from "lucide-react";
import type { TemplateProps as Props } from "../types";
import { records, section } from "../content";
import { words } from "./elements";
import { useMizanCopy } from "./copy";
import { InspectionDiagram } from "./diagram";

export function Approach({ props }: { props: Props }) {
  const t = useMizanCopy(props.locale);
  const checks = records(section(props.snapshot.sections, "process").items);
  const deliverables = [
    [Camera, "annotatedPhotos"],
    [FileText, "findingsUrgency"],
    [ChartNoAxesColumnIncreasing, "diagnosticReadings"],
    [Video, "walkthrough"],
  ] as const;
  return (
    <section id="approach" className="mizan3-section mizan3-approach">
      <div>
        <h2 className="mizan3-eyebrow">{t("whatWeCheck")}</h2>
        <div className="mizan3-checks">
          <InspectionDiagram />
          <ul>
            {checks.map((item, i) => (
              <li key={i}>{words(item.title, props.locale)}</li>
            ))}
          </ul>
        </div>
      </div>
      <div>
        <h2 className="mizan3-eyebrow">{t("whatYouReceive")}</h2>
        <ul className="mizan3-deliverables">
          {deliverables.map(([Icon, key]) => (
            <li key={key}>
              <Icon aria-hidden="true" strokeWidth={1.6} />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
      </div>
      <aside>
        <h2 className="mizan3-eyebrow">{t("importantNote")}</h2>
        <Info aria-hidden="true" />
        <p>{t("scopeNote")}</p>
        <span className="mizan3-small-rule" />
        <p className="mizan3-eyebrow">{t("honestEvidence")}</p>
      </aside>
    </section>
  );
}
