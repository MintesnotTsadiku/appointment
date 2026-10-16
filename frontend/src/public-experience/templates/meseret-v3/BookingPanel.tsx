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
import { useMeseretCopy } from "./copy";

export function BookingPanel({ props }: { props: Props }) {
  const t = useMeseretCopy(props.locale);
  const content = section(props.snapshot.sections, "booking_cta");
  const services = records(section(props.snapshot.sections, "services").items);
  const [selected, setSelected] = useState("");
  const service = services.find((item) => item.id === selected) || services[0];
  const href =
    service &&
    ((typeof service.id === "string" &&
      props.snapshot.bookingPaths?.[service.id]) ||
      action(service.action, props.locale)?.href);
  return (
    <section className="meseret3-reserve" id="reserve">
      <h2>{words(content.title, props.locale)}</h2>
      <p>{words(content.body, props.locale)}</p>
      <ol className="meseret3-booking-steps">
        <li>
          <h3>
            <b>01</b>
            <label id="meseret-service-label">{t("chooseService")}</label>
          </h3>
          <p>{t("serviceHint")}</p>
          <Select
            value={selected || String(service?.id || "")}
            onValueChange={setSelected}
          >
            <SelectTrigger aria-labelledby="meseret-service-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="meseret3-select" style={props.rootStyle}>
              {services.map((item) => (
                <SelectItem key={String(item.id)} value={String(item.id)}>
                  {words(item.name, props.locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </li>
        <li>
          <h3>
            <b>02</b>
            {t("chooseTime")}
          </h3>
          <p>{t("timeHint")}</p>
          <Live props={props} />
        </li>
        <li>
          <h3>
            <b>03</b>
            {t("confirm")}
          </h3>
          <p>{t("confirmHint")}</p>
          <Book props={props} href={href || undefined}>
            {t("continue")}
          </Book>
        </li>
      </ol>
    </section>
  );
}
