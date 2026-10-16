import { AlertCircle, CircleCheck, MinusCircle } from "lucide-react";
import type { TemplateProps as Props } from "../types";
import { Photo } from "./elements";
import { Brand } from "./chrome";
import { useMizanCopy } from "./copy";

export function Report({ props }: { props: Props }) {
  const t = useMizanCopy(props.locale);
  const rows = [
    ["frontBrakes", "attention", "brakeNote", AlertCircle],
    ["visibleLeaks", "noneObserved", "leakNote", CircleCheck],
    ["faultScan", "reviewTogether", "scanNote", MinusCircle],
  ] as const;
  return (
    <section className="mizan3-section mizan3-report">
      <div className="mizan3-report-head">
        <div>
          <p className="mizan3-eyebrow">{t("sampleReport")}</p>
          <h2>{t("sampleVehicle")}</h2>
          <p>{t("sampleDisclaimer")}</p>
        </div>
        <div className="mizan3-report-brand">
          <Brand props={props} />
        </div>
        <p className="mizan3-report-stamp">
          {t("vehicleReport")}
          <br />
          {t("sampleOnly")}
        </p>
      </div>
      <div className="mizan3-report-body">
        <table>
          <caption className="sr-only">{t("sampleReport")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("area")}</th>
              <th scope="col">{t("findings")}</th>
              <th scope="col">{t("notes")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([area, finding, note, Icon], i) => (
              <tr key={area}>
                <th scope="row">{t(area)}</th>
                <td>
                  <span className={`mizan3-finding mizan3-finding-${i}`}>
                    <Icon aria-hidden="true" />
                    {t(finding)}
                  </span>
                </td>
                <td>{t(note)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <figure>
          <Photo props={props} role="brake.mizan" />
          <figcaption>{t("brakeCaption")}</figcaption>
        </figure>
      </div>
    </section>
  );
}
