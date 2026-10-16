import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import type { TemplateProps as Props } from "../types";
import { action, records, section } from "../content";
import { Book, Live, words } from "./elements";
import { useEnkuaCopy } from "./copy";

export function BookingStrip({ props }: { props: Props }) {
  const content = section(props.snapshot.sections, "process");
  const services = records(section(props.snapshot.sections, "services").items);
  const [selected, setSelected] = useState("");
  const t = useEnkuaCopy(props.locale);
  const service = services.find((item) => item.id === selected) || services[0];
  const href =
    service &&
    ((typeof service.id === "string" &&
      props.snapshot.bookingPaths?.[service.id]) ||
      action(service.action, props.locale)?.href);
  return (
    <section className="enkua3-booking-strip" id="reserve">
      <h2>{words(content.title, props.locale)}</h2>
      <div className="enkua3-booking-options">
        <ol>
          {records(content.items).map((step, index) => (
            <li key={index}>
              <b>{index + 1}</b>
              <span>{words(step.title, props.locale)}</span>
            </li>
          ))}
        </ol>
        <div className="enkua3-booking-fields">
          <div>
            <label id="enkua-package-label">{t("package")}</label>
            <Select
              value={selected || String(service?.id || "")}
              onValueChange={setSelected}
            >
              <SelectTrigger aria-labelledby="enkua-package-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                className="enkua3-select"
                style={{
                  ...props.rootStyle,
                  background: "var(--pe-color-canvas)",
                  color: "var(--pe-color-text)",
                  fontFamily: "var(--pe-font-body)",
                  borderRadius: 0,
                }}
              >
                {services.map((item) => (
                  <SelectItem key={String(item.id)} value={String(item.id)}>
                    {words(item.name, props.locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p>{t("chooseTimeNext")}</p>
          <Book props={props} href={href || undefined}>
            {t("startBooking")}
          </Book>
        </div>
        <Live props={props} />
      </div>
    </section>
  );
}
