import { useState } from "react";
import { CalendarDays, Clock3, MapPin } from "lucide-react";
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
import { useMizanCopy } from "./copy";

export function BookingPanel({ props }: { props: Props }) {
  const t = useMizanCopy(props.locale);
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
    <section id="reserve" className="mizan3-section mizan3-reserve">
      <div>
        <p className="mizan3-eyebrow">{t("bookAppointment")}</p>
        <h2>{words(content.title, props.locale)}</h2>
      </div>
      <div>
        <ol className="mizan3-booking-steps">
          {["chooseCheck", "chooseTime", "confirmVisit"].map((key, i) => (
            <li key={key}>
              <b>{i + 1}</b>
              <span>{t(key)}</span>
            </li>
          ))}
        </ol>
        <div className="mizan3-booking-fields">
          <div>
            <label id="mizan-service-label">{t("service")}</label>
            <Select
              value={selected || String(service?.id || "")}
              onValueChange={setSelected}
            >
              <SelectTrigger aria-labelledby="mizan-service-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="mizan3-select" style={props.rootStyle}>
                {services.map((item) => (
                  <SelectItem key={String(item.id)} value={String(item.id)}>
                    {words(item.name, props.locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mizan3-booking-hint">{t("vehicleNote")}</p>
          <div className="mizan3-next-fields">
            <span>
              <MapPin aria-hidden="true" />
              {t("locationNext")}
            </span>
            <span>
              <CalendarDays aria-hidden="true" />
              {t("dateNext")}
            </span>
            <span>
              <Clock3 aria-hidden="true" />
              {t("timeNext")}
            </span>
          </div>
        </div>
        <div className="mizan3-booking-action">
          <Book props={props} href={href || undefined}>
            {t("chooseAvailableTime")}
          </Book>
          <p>{t("liveBookingNote")}</p>
        </div>
        <Live props={props} />
      </div>
    </section>
  );
}
