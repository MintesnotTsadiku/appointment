import { useState } from "react";
import { CalendarDays, UserRound } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import type { TemplateProps as Props } from "../types";
import { records, section } from "../content";
import { Book, Live, words } from "./elements";
import { serviceHref } from "./Services";
import { SectionHead } from "./Story";
import { useBunaCopy } from "./copy";

export function BookingPanel({ props }: { props: Props }) {
  const t = useBunaCopy(props.locale);
  const content = section(props.snapshot.sections, "booking_cta");
  const services = records(section(props.snapshot.sections, "services").items);
  const [selected, setSelected] = useState("");
  const service = services.find((item) => item.id === selected) || services[0];
  return (
    <section className="buna3-section buna3-reserve">
      <SectionHead
        number="04"
        title={words(content.title, props.locale)}
        note={words(content.body, props.locale)}
      />
      <div className="buna3-planner">
        <div className="buna3-planner-fields">
          <div>
            <label id="buna-service-label">{t("experience")}</label>
            <Select
              value={selected || String(service?.id || "")}
              onValueChange={setSelected}
            >
              <SelectTrigger aria-labelledby="buna-service-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="buna3-select" style={props.rootStyle}>
                {services.map((item) => (
                  <SelectItem key={String(item.id)} value={String(item.id)}>
                    {words(item.name, props.locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="buna3-field-label">{t("dateTime")}</span>
            <p className="buna3-field-hint">
              <CalendarDays aria-hidden="true" />
              {t("dateHint")}
            </p>
          </div>
          <p className="buna3-private">
            <UserRound aria-hidden="true" />
            {t("private")}
          </p>
          <Book
            props={props}
            href={
              service ? serviceHref(props, service) || undefined : undefined
            }
          >
            {t("reserve")}
          </Book>
        </div>
        {props.snapshot.booking?.liveAvailability === true ? (
          <div className="buna3-availability">
            <h3>{t("availability")}</h3>
            <Live props={props} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
