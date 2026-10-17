import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import type { TemplateProps as Props } from "../types";
import { durationMinutes, formatPrice, records, section } from "../content";
import { usePublicChrome } from "../chrome";
import { Book, Live, words } from "./elements";
import { Field } from "./Notebook";
import { serviceHref } from "./Services";
import { useHanaCopy } from "./copy";

export function BookingPanel({ props }: { props: Props }) {
  const t = useHanaCopy(props.locale);
  const chrome = usePublicChrome(props.locale);
  const content = section(props.snapshot.sections, "booking_cta");
  const services = records(section(props.snapshot.sections, "services").items);
  const [selected, setSelected] = useState("");
  const service = services.find((item) => item.id === selected) || services[0];
  return (
    <Field
      props={props}
      number="04"
      title={words(content.title, props.locale)}
      note={words(content.body, props.locale)}
      id="reserve"
    >
      <div className="hana3-planner">
        <div className="hana3-selected">
          <label id="hana-service-label">{t("experience")}</label>
          <Select
            value={selected || String(service?.id || "")}
            onValueChange={setSelected}
          >
            <SelectTrigger aria-labelledby="hana-service-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="hana3-select" style={props.rootStyle}>
              {services.map((item) => (
                <SelectItem key={String(item.id)} value={String(item.id)}>
                  {words(item.name, props.locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {service ? (
            <p>
              {chrome.t("minutes", {
                count: durationMinutes(service.durationMinutes) || 0,
              })}
              {props.snapshot.booking?.showPrices !== false
                ? ` · ${formatPrice(service.price, service.currency, props.locale)}`
                : ""}
            </p>
          ) : null}
        </div>
        <div className="hana3-calendar">
          <h3>{t("dateTime")}</h3>
          <p>{t("dateHint")}</p>
          <Live props={props} />
        </div>
        <div className="hana3-continue">
          <p>Africa/Addis_Ababa · UTC+3</p>
          <Book
            props={props}
            href={
              service ? serviceHref(props, service) || undefined : undefined
            }
          >
            {t("continue")}
          </Book>
          <small>{t("bookingNote")}</small>
        </div>
      </div>
    </Field>
  );
}
