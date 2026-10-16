import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { TemplateProps as Props } from "../types";
import {
  action,
  contentImage,
  localized,
  section,
  type ContentRecord,
} from "../content";
import { usePublicChrome } from "../chrome";
import {
  habeshaPhrase,
  loadingAttributes,
  pictureSet,
  slotLabel,
  useNextAvailability,
} from "../kit";

export const words = (item: unknown, locale: string) => localized(item, locale);

export const withLocale = (href: string, locale: string) => {
  if (locale !== "am" || !href.startsWith("/")) return href;
  const url = new URL(href, "https://local.invalid");
  if (url.pathname.startsWith("/schedule/")) url.searchParams.set("lang", "am");
  else if (/\/(book|blog|gallery)(\/|$)/.test(url.pathname))
    url.searchParams.set("locale", "am");
  return url.pathname + url.search + url.hash;
};

export function Photo({
  props,
  role,
  item,
  eager = false,
  decorative = false,
}: {
  props: Props;
  role: string;
  item?: ContentRecord;
  eager?: boolean;
  decorative?: boolean;
}) {
  const custom = item ? contentImage(item, props.locale) : null;
  const assets = props.snapshot.compiledDesign.assets;
  const packaged = custom
    ? Object.values(assets).find((asset) => asset.src === custom.src)
    : undefined;
  const asset = packaged || custom || assets[role];
  if (!asset) return null;
  const picture = pictureSet(asset, {
    sizes: "(max-width: 700px) 100vw, 50vw",
  });
  return (
    <picture>
      {picture.sources.map((source, index) => (
        <source key={index} {...source} />
      ))}
      <img
        {...picture.img}
        {...loadingAttributes(eager)}
        alt={
          decorative
            ? ""
            : custom?.alt ||
              (props.locale === "am"
                ? words(item?.imageAlt, props.locale)
                : asset.alt) ||
              ""
        }
      />
    </picture>
  );
}

export function Book({
  props,
  href,
  children,
}: {
  props: Props;
  href?: string;
  children?: ReactNode;
}) {
  const label = action(
    section(props.snapshot.sections, "hero").primaryAction,
    props.locale,
  );
  const target = href || label?.href;
  return target ? (
    <Link
      className="mizan3-button"
      to={withLocale(target, props.locale)}
      data-qa="mizan-book"
    >
      {children || label?.label}
      <span aria-hidden="true">↗</span>
    </Link>
  ) : null;
}

export function Live({ props }: { props: Props }) {
  const { snapshot } = props;
  const live = useNextAvailability(
    snapshot.booking?.liveAvailability === true,
    props.publicRoot,
  );
  const chrome = usePublicChrome(props.locale);
  if (!live.data?.next)
    return props.snapshot.booking?.liveAvailability === true ? (
      <p className="mizan3-live" aria-hidden="true">
        &nbsp;
      </p>
    ) : null;
  const slot = slotLabel(
    live.data.next.start,
    new Date(),
    live.data.timezone,
    props.locale,
  );
  return (
    <p className="mizan3-live" data-qa="mizan-next">
      <span aria-hidden="true">●</span>{" "}
      {chrome.t("nextFree", {
        when: slot.when === "day" ? slot.weekday : chrome.t(slot.when),
        time: props.locale === "am" ? habeshaPhrase(slot.time) : slot.time,
      })}
    </p>
  );
}
