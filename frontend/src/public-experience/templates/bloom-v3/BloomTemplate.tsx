import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode, type RefObject } from "react";
import { useNavigate } from "react-router-dom";

import { formatPhone, phoneHref } from "@/lib/phone";
import type { BookingTemplateProps, TemplateProps } from "../types";
import type { ContentRecord } from "../content";
import { action, brandLogo, durationMinutes, formatPrice, localized, records, section } from "../content";
import { useTemplateCredit } from "../credit";
import { usePublicChrome, type PublicChrome } from "../chrome";
import { useScrollState } from "../motion";
import {
  bookingTransition, circularModeSwitch, useCountUp, useMotionLevel, useNextAvailability, usePointerEffects,
  useReveal, useScrollProgress, useSectionProgress, useTimeOfDay,
  type MotionLevel, type NextAvailability, type OpeningDay, type TimeOfDay,
} from "../kit";
import { BENEFIT_ART, Curl, Mirror } from "./art";
import { art, BeforeAfter, CopyChip, HoursList, LookStack, NextChip, OpenBadge, Photo, Reviews, role, slotText, type Art, type Look, type Review } from "./parts";
import { withAccentInk } from "./ink";
import { BloomHoliday } from "./holiday";
import "./bloom.css";

/*
 * Bloom Hair v3, "Golden Hour Salon": a glossy beauty campaign shot at golden hour.
 * Shape language: the round-top salon mirror with a thin gold line and a crown of bulbs.
 * Marigold fills booking actions only. After dark (Addis Ababa time) and in dark mode the hero
 * and the booking band switch to their night photos ("after hours"). Behaviour comes from the
 * headless kit; every visual here belongs to this package.
 */

const BULBS = 11;

function useBloomMotion(root: RefObject<HTMLDivElement | null>, motion: unknown, locale: string) {
  const level = useMotionLevel(motion);
  useReveal(root, level, locale);
  useScrollProgress(root, level, "standard", locale);
  useCountUp(root, level, locale, locale);
  usePointerEffects(root, level, locale);
  return level;
}

/** Night photos: always in dark mode; in light mode after dark in Addis Ababa (the hero and the band are dark stages in both modes). */
function useNight(mode: TemplateProps["mode"], now: TimeOfDay) {
  return mode === "dark" || now.afterDark;
}

function greeting(chrome: PublicChrome, now: TimeOfDay) {
  return chrome.t(now.part === "morning" ? "greetingMorning" : now.part === "afternoon" ? "greetingAfternoon" : now.part === "evening" ? "greetingEvening" : "greetingNight");
}

function Bulbs() {
  return <span className="b3-bulbs" aria-hidden="true">{Array.from({ length: BULBS }, (_, index) => {
    const angle = Math.PI - (Math.PI * index) / (BULBS - 1);
    return <i key={index} style={{ left: `${50 + 50 * Math.cos(angle)}%`, top: `${100 - 100 * Math.sin(angle)}%`, "--n": index } as CSSProperties} />;
  })}</span>;
}

function ModeButton({ chrome, mode, toggleMode, level }: { chrome: PublicChrome; mode: TemplateProps["mode"]; toggleMode: () => void; level: MotionLevel }) {
  return <button type="button" className="b3-mode" onClick={(event) => circularModeSwitch(event.currentTarget, toggleMode, level)}
    aria-label={chrome.modeSwitchLabel(mode)} data-qa="bloom-mode">
    <span className="b3-mode-icon" aria-hidden="true" />
    <span className="b3-mode-text">{chrome.modeName(mode)}</span>
  </button>;
}

function Bar({ logo, name, root, chrome, mode, toggleMode, level, children }: { logo?: string; name: string; root: string; chrome: PublicChrome; mode: TemplateProps["mode"]; toggleMode: () => void; level: MotionLevel; children?: ReactNode }) {
  const scroll = useScrollState(40);
  return <header className="b3-bar" data-scrolled={scroll.scrolled}>
    <div className="b3-wrap b3-bar-inner">
      <a className="b3-brand" href={root}>{logo ? <img src={logo} alt="" width={36} height={36} /> : null}<span>{name}</span></a>
      {children}
      <ModeButton chrome={chrome} mode={mode} toggleMode={toggleMode} level={level} />
    </div>
  </header>;
}

/** A booking link that morphs into the booking page header where the browser can. */
function BookLink({ href, label, level, className = "b3-btn", qa, magnetic = true }: { href: string; label: string; level: MotionLevel; className?: string; qa?: string; magnetic?: boolean }) {
  const navigate = useNavigate();
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (/\/book(\?|$)/.test(href)) bookingTransition(event, href, navigate, level);
  };
  return <a className={className} href={href} onClick={onClick} data-magnetic={magnetic ? "6" : undefined} data-qa={qa}>
    <span>{label}</span><span className="b3-btn-arrow" aria-hidden="true">→</span>
  </a>;
}

function placeDays(snapshot: TemplateProps["snapshot"], id: unknown): OpeningDay[] {
  const hours = snapshot.placeHours || {};
  const own = typeof id === "string" ? hours[id] : undefined;
  return (own || Object.values(hours)[0])?.days || [];
}

function useLiveAvailability(snapshot: TemplateProps["snapshot"], publicRoot: string) {
  return useNextAvailability(snapshot.booking?.liveAvailability === true, publicRoot);
}

const LOOK_KEYS = ["lookBraids", "lookTaper", "lookSilk"] as const;

/** The index of the item in the middle of the screen, among `selector` inside `root` (the sticky story photo follows it). */
function useActiveIndex(root: RefObject<HTMLElement | null>, selector: string, key: unknown): number {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const node = root.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    const items = Array.from(node.querySelectorAll<HTMLElement>(selector));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(items.indexOf(entry.target as HTMLElement));
    }, { rootMargin: "-40% 0px -45% 0px" });
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [root, selector, key]);
  return active;
}

export function BloomSite({ snapshot, locale, applicationName, publicRoot, rootStyle, mode, toggleMode }: TemplateProps) {
  const chrome = usePublicChrome(locale);
  const credit = useTemplateCredit(chrome);
  const root = useRef<HTMLDivElement>(null);
  const design = snapshot.compiledDesign;
  const level = useBloomMotion(root, design.motion, locale);
  const now = useTimeOfDay();
  const night = useNight(mode, now);
  const live = useLiveAvailability(snapshot, publicRoot);
  const progress = useSectionProgress(root, locale);
  const [habesha, setHabesha] = useState(locale === "am");
  const [room, setRoom] = useState(0);
  const sticky = useScrollState(560);
  const band = useRef<HTMLElement>(null);
  const [bandVisible, setBandVisible] = useState(false);
  useEffect(() => {
    const node = band.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => setBandVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const providers = section(snapshot.sections, "providers");
  const process = section(snapshot.sections, "process");
  const proof = section(snapshot.sections, "proof");
  const about = section(snapshot.sections, "about");
  const benefits = section(snapshot.sections, "benefits");
  const testimonials = section(snapshot.sections, "testimonials");
  const faq = section(snapshot.sections, "faq");
  const locations = section(snapshot.sections, "locations");
  const contact = section(snapshot.sections, "contact");
  const booking = section(snapshot.sections, "booking_cta");
  const gallery = section(snapshot.sections, "gallery");
  const footer = section(snapshot.sections, "footer");

  const primary = action(hero.primaryAction, locale);
  const secondary = action(hero.secondaryAction, locale);
  const bookingAction = action(booking.action, locale);
  const bookLabel = primary?.label || bookingAction?.label || "";
  const bookHref = primary?.href || bookingAction?.href;
  const logo = brandLogo(design);
  const word = (design.identity.shortName || applicationName.split(" ")[0] || "").slice(0, 10);
  const heroImage = art(hero, locale, design, "hero.primary");
  const menu = records(services.items);
  const stylists = records(providers.items);
  const steps = records(process.items);
  const facts = records(proof.items);
  const notes = records(benefits.items);
  const reviews: Review[] = records(testimonials.items).map((item) => ({ quote: localized(item.quote, locale), who: localized(item.attribution, locale), role: localized(item.role, locale) })).filter((item) => item.quote);
  const questions = records(faq.items);
  const rooms = records(locations.items);
  const phone = typeof contact.phone === "string" ? contact.phone : "";
  const ownGallery = records(gallery.items).map((item) => ({ item, image: art(item, locale, design, "") })).filter((row): row is { item: ContentRecord; image: Art } => Boolean(row.image));
  const templateLooks: Look[] = ["look1.bloom", "look2.bloom", "look3.bloom"].map((name, index) => ({ image: role(design, name), caption: chrome.t(LOOK_KEYS[index]) }))
    .filter((look): look is Look => Boolean(look.image));
  const looks: Look[] = ownGallery.length >= 2 ? ownGallery.slice(0, 3).map((row) => ({ image: row.image, caption: localized(row.item.caption, locale) || localized(gallery.title, locale) })) : templateLooks;
  const lookbook: Look[] = ownGallery.length ? ownGallery.map((row) => ({ image: row.image, caption: localized(row.item.caption, locale) })) : templateLooks;
  const before = role(design, "before.bloom");
  const after = role(design, "after.bloom");
  const wordPhoto = role(design, "look1.bloom");
  const data: NextAvailability | null = live.data;
  const days = placeDays(snapshot, rooms[room]?.id);
  const bookNow = bookHref && bookLabel;
  const stepArt = ["menu3.bloom", "menu1.bloom", "look3.bloom"];
  const showDots = progress.sections.length > 4;
  const activeStep = useActiveIndex(root, ".b3-steps-list li", locale);

  return <div ref={root} data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} data-motion={design.motion} data-motion-level={level}
    data-night={night} data-daypart={now.part} lang={locale} className="b3" data-template="bloom-hair-v3" style={withAccentInk(rootStyle)}>
    <a className="b3-skip" href="#b3-main">{chrome.t("skip")}</a>
    <Bar logo={logo} name={applicationName} root={publicRoot} chrome={chrome} mode={mode} toggleMode={toggleMode} level={level}>
      <nav aria-label={chrome.t("navLabel")} className="b3-nav">
        {menu.length ? <a href="#services">{chrome.t("menu")}</a> : null}
        {lookbook.length ? <a href="#looks">{chrome.t("lookbook")}</a> : null}
        {stylists.length ? <a href="#team">{chrome.t("team")}</a> : null}
        {rooms.length ? <a href="#visit">{chrome.t("visit")}</a> : null}
        <a href={`${publicRoot}/blog`}>{chrome.t("journal")}</a>
      </nav>
      {bookNow ? <BookLink href={bookHref!} label={bookLabel} level={level} className="b3-btn b3-bar-book" magnetic={false} /> : null}
    </Bar>

    {showDots ? <nav className="b3-dots" aria-label={chrome.t("onThisPage")} data-hidden={progress.active === 0}>
      <ol>{progress.sections.map((item, index) => <li key={item.id}><a href={`#${item.id}`} aria-current={index === progress.active ? "true" : undefined}><span>{item.label}</span></a></li>)}</ol>
    </nav> : null}

    <main id="b3-main">
      <section className="b3-hero" id="top" data-section={applicationName} aria-labelledby="b3-hero-title">
        <div className="b3-hero-grain" aria-hidden="true" />
        <div className="b3-wrap b3-hero-grid">
          <div className="b3-hero-copy">
            <div className="b3-greet" data-qa="bloom-greeting"><span>{greeting(chrome, now)}</span>{days.length ? <OpenBadge days={days} now={now} chrome={chrome} locale={locale} habesha={locale === "am"} /> : null}</div>
            <BloomHoliday snapshot={snapshot} locale={locale} chrome={chrome} />
            {word ? <p className="b3-word" aria-hidden="true" style={{ "--len": Math.max(4, word.length), ...(wordPhoto ? { "--b3-word-photo": `url("${wordPhoto.widths?.length ? wordPhoto.src.replace(/\.webp$/, `-w${wordPhoto.widths[0]}.webp`) : wordPhoto.src}")` } : {}) } as CSSProperties}>
              <span className="b3-word-fill">{word}</span><span className="b3-word-line">{word}</span>
            </p> : null}
            <h1 id="b3-hero-title">{localized(hero.title, locale)}</h1>
            {localized(hero.subtitle || hero.body, locale) ? <p className="b3-lede">{localized(hero.subtitle || hero.body, locale)}</p> : null}
            <div className="b3-actions">
              {bookNow ? <BookLink href={bookHref!} label={bookLabel} level={level} qa="bloom-hero-book" /> : null}
              {secondary ? <a className="b3-link" href={secondary.href}>{secondary.label}</a> : null}
            </div>
            <NextChip facts={data?.next ? { next: data.next.start, todayLeft: data.todayLeft } : null} data={data} chrome={chrome} locale={locale} variant="nextFreeChair" qa="bloom-next-free" />
          </div>
          <div className="b3-hero-visual">
            {heroImage ? <figure className="b3-mirror" data-reveal="mirror" data-scroll="">
              <Photo image={heroImage} eager night={night} sizes="(max-width: 760px) 92vw, 44vw" className="b3-mirror-photo" />
              <Bulbs />
            </figure> : null}
            <LookStack looks={looks} chrome={chrome} level={level} />
          </div>
        </div>
      </section>

      {menu.length ? <section className="b3-section b3-menu-band" id="services" data-section={chrome.t("menu")} aria-labelledby="b3-menu-title">
        <div className="b3-wrap b3-menu-grid">
          <header className="b3-head" data-reveal="rise">
            <p className="b3-eyebrow">{chrome.t("menu")}</p>
            <h2 id="b3-menu-title">{localized(services.title, locale)}</h2>
            {localized(services.intro, locale) ? <p className="b3-muted">{localized(services.intro, locale)}</p> : null}
          </header>
          <MenuBoard items={menu} locale={locale} chrome={chrome} design={design} data={data} />
        </div>
      </section> : null}

      {lookbook.length ? <section className="b3-section b3-looks" id="looks" data-section={chrome.t("lookbook")} aria-labelledby="b3-looks-title">
        <div className="b3-wrap">
          <header className="b3-head b3-head-row" data-reveal="rise">
            <div><p className="b3-eyebrow">{chrome.t("lookbook")}</p><h2 id="b3-looks-title">{localized(gallery.title, locale) || chrome.t("lookbook")}</h2>
              {localized(gallery.intro, locale) ? <p className="b3-muted">{localized(gallery.intro, locale)}</p> : null}</div>
          </header>
          <div className="b3-looks-grid">
            <Rail looks={lookbook} chrome={chrome} />
            {!ownGallery.length && before && after ? <BeforeAfter before={before} after={after} chrome={chrome} caption={chrome.t("lookSilk")} /> : null}
          </div>
        </div>
      </section> : null}

      {stylists.length ? <section className="b3-section b3-team" id="team" data-section={chrome.t("team")} aria-labelledby="b3-team-title">
        <div className="b3-wrap">
          <header className="b3-head" data-reveal="rise"><p className="b3-eyebrow">{chrome.t("team")}</p><h2 id="b3-team-title">{localized(providers.title, locale)}</h2>
            {localized(providers.intro, locale) ? <p className="b3-muted">{localized(providers.intro, locale)}</p> : null}</header>
          <ul className="b3-chairs" data-reveal-stagger="">{stylists.map((item, index) => {
            const photo = art(item, locale, design, "");
            const name = localized(item.name, locale);
            const choose = action(item.action, locale);
            const tags = records(item.specialties).map((entry) => localized(entry, locale)).filter(Boolean);
            const first = name.split(" ")[0];
            return <li key={String(item.id || index)} className="b3-chair" data-reveal="rise" data-tilt="3" data-glow="">
              <div className="b3-chair-frame">{photo ? <Photo image={{ ...photo, alt: photo.alt || name }} sizes="(max-width: 760px) 80vw, 320px" /> : <Mirror className="b3-chair-empty" />}</div>
              <h3>{name}</h3>
              {localized(item.role, locale) ? <p className="b3-chair-role">{localized(item.role, locale)}</p> : null}
              {tags.length ? <ul className="b3-tags">{tags.map((tag) => <li key={tag}>{tag}</li>)}</ul> : null}
              <NextChip facts={typeof item.id === "string" ? data?.providers[item.id] : null} data={data} chrome={chrome} locale={locale} qa={`bloom-chair-next-${index}`} />
              {choose ? <a className="b3-ghost" href={choose.href}>{chrome.t("bookWith", { name: first })}</a> : null}
            </li>;
          })}</ul>
        </div>
      </section> : null}

      {localized(about.body, locale) ? <section className="b3-section b3-story" id="story" data-section={localized(about.title, locale)} aria-labelledby="b3-story-title">
        <div className="b3-wrap b3-story-grid">
          {(() => { const image = art(about, locale, design, "section.detail"); return image ? <div className="b3-story-photo" data-scroll="" data-pan=""><Photo image={image} sizes="(max-width: 760px) 92vw, 62vw" /></div> : null; })()}
          <div className="b3-story-card" data-reveal="rise">
            <h2 id="b3-story-title">{localized(about.title, locale)}</h2>
            <p>{localized(about.body, locale)}</p>
            {records(about.highlights).length || Array.isArray(about.highlights) ? <ul className="b3-tags">{(Array.isArray(about.highlights) ? about.highlights : []).map((entry, index) => <li key={index}>{localized(entry, locale)}</li>)}</ul> : null}
          </div>
        </div>
      </section> : null}

      {steps.length ? <section className="b3-section b3-steps" id="visit-steps" data-section={localized(process.title, locale)} aria-labelledby="b3-steps-title">
        <div className="b3-wrap b3-steps-grid">
          <div className="b3-steps-visual">
            <div className="b3-steps-frame">{steps.slice(0, 6).map((item, index) => {
              const image = art(item, locale, design, "") || art(process, locale, design, stepArt[index % stepArt.length]);
              return image ? <Photo key={index} image={image} sizes="(max-width: 760px) 80vw, 36vw" className={index === Math.min(activeStep, steps.length - 1) ? "b3-steps-photo is-on" : "b3-steps-photo"} decorative={index > 0} /> : null;
            })}</div>
          </div>
          <div>
            <header className="b3-head" data-reveal="rise"><h2 id="b3-steps-title">{localized(process.title, locale)}</h2>{localized(process.intro, locale) ? <p className="b3-muted">{localized(process.intro, locale)}</p> : null}</header>
            <div className="b3-steps-list">
              <Curl className="b3-curl" />
              <ol>{steps.map((item, index) => <li key={index} data-reveal="rise" style={{ "--i": index } as CSSProperties}>
                <span className="b3-step-no" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <div><h3><span className="b3-sr">{chrome.t("step", { count: index + 1 })}: </span>{localized(item.title, locale)}</h3><p className="b3-muted">{localized(item.description, locale)}</p></div>
              </li>)}</ol>
            </div>
          </div>
        </div>
      </section> : null}

      {facts.length ? <section className="b3-proof" aria-labelledby="b3-proof-title">
        <div className="b3-wrap">
          <h2 id="b3-proof-title" className="b3-sr">{localized(proof.title, locale)}</h2>
          <ul className="b3-proof-list" data-reveal-stagger="">{facts.map((item, index) => <li key={index} data-reveal="rise">
            <p className="b3-proof-value" data-count="">{localized(item.value, locale)}</p>
            <p className="b3-proof-label">{localized(item.label, locale)}</p>
            {localized(item.detail, locale) ? <p className="b3-proof-detail">{localized(item.detail, locale)}</p> : null}
          </li>)}</ul>
        </div>
      </section> : null}

      {notes.length ? <section className="b3-section b3-bento-band" aria-labelledby="b3-notes-title">
        <div className="b3-wrap">
          <header className="b3-head" data-reveal="rise"><h2 id="b3-notes-title">{localized(benefits.title, locale)}</h2>{localized(benefits.intro, locale) ? <p className="b3-muted">{localized(benefits.intro, locale)}</p> : null}</header>
          <ul className="b3-bento" data-reveal-stagger="">
            {notes.slice(0, 4).map((item, index) => {
              const Icon = BENEFIT_ART[index % BENEFIT_ART.length];
              return <li key={index} className="b3-tile" data-reveal="rise" data-glow=""><Icon className="b3-tile-art" /><h3>{localized(item.title, locale)}</h3><p className="b3-muted">{localized(item.description, locale)}</p></li>;
            })}
            {(() => { const image = art(benefits, locale, design, "look2.bloom"); return image ? <li className="b3-tile b3-tile-photo" data-reveal="mask" data-pan=""><Photo image={image} sizes="(max-width: 760px) 92vw, 30vw" /></li> : null; })()}
          </ul>
        </div>
      </section> : null}

      {reviews.length ? <section className="b3-section b3-reviews" id="reviews" data-section={localized(testimonials.title, locale)} aria-labelledby="b3-reviews-title">
        <div className="b3-wrap">
          <header className="b3-head" data-reveal="rise"><h2 id="b3-reviews-title">{localized(testimonials.title, locale)}</h2>{localized(testimonials.intro, locale) ? <p className="b3-muted">{localized(testimonials.intro, locale)}</p> : null}</header>
        </div>
        <Reviews items={reviews} chrome={chrome} level={level}
          aside={(() => { const image = art(testimonials, locale, design, "look3.bloom"); return image ? <div className="b3-pull-photo"><Photo image={image} sizes="(max-width: 760px) 60vw, 320px" /></div> : null; })()} />
      </section> : null}

      {questions.length ? <section className="b3-section b3-faq" id="faq" data-section={localized(faq.title, locale)} aria-labelledby="b3-faq-title">
        <div className="b3-wrap b3-faq-grid">
          <div>
            <header className="b3-head" data-reveal="rise"><h2 id="b3-faq-title">{localized(faq.title, locale)}</h2></header>
            <div className="b3-faq-list">{questions.map((item, index) => <details key={index} name="b3-faq">
              <summary><span>{localized(item.question, locale)}</span><i aria-hidden="true" /></summary>
              <div className="b3-faq-answer"><p>{localized(item.answer, locale)}</p></div>
            </details>)}</div>
          </div>
          <aside className="b3-ask" data-reveal="rise" aria-label={chrome.t("stillUnsure")}>
            {(() => { const image = art(faq, locale, design, "menu3.bloom"); return image ? <div className="b3-ask-photo"><Photo image={image} sizes="(max-width: 760px) 92vw, 400px" /></div> : null; })()}
            <div className="b3-ask-card">
              <h3>{chrome.t("stillUnsure")}</h3>
              {phone ? <a className="b3-ghost" href={phoneHref(phone) || `tel:${phone.replace(/\s+/g, "")}`}>{chrome.t("call")} · {formatPhone(phone)}</a> : null}
              <HoursList days={days} chrome={chrome} locale={locale} habesha={habesha} onHabesha={setHabesha} />
            </div>
          </aside>
        </div>
      </section> : null}

      {rooms.length ? <section className="b3-section b3-rooms" id="visit" data-section={chrome.t("visit")} aria-labelledby="b3-rooms-title">
        <div className="b3-wrap">
          <header className="b3-head" data-reveal="rise"><p className="b3-eyebrow">{chrome.t("rooms")}</p><h2 id="b3-rooms-title">{localized(locations.title, locale)}</h2>{localized(locations.intro, locale) ? <p className="b3-muted">{localized(locations.intro, locale)}</p> : null}</header>
          {rooms.length > 1 ? <div className="b3-tabs" role="tablist" aria-label={chrome.t("rooms")}>{rooms.map((item, index) => <button key={String(item.id || index)} type="button" role="tab"
            id={`b3-room-tab-${index}`} aria-controls="b3-room-panel" aria-selected={index === room} tabIndex={index === room ? 0 : -1} data-qa={`bloom-room-tab-${index}`}
            onClick={() => setRoom(index)} onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                const next = (room + (event.key === "ArrowRight" ? 1 : rooms.length - 1)) % rooms.length;
                setRoom(next);
                (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
              }
            }}>{localized(item.name, locale)}</button>)}</div> : null}
          {(() => {
            const item = rooms[room] || rooms[0];
            const image = art(item, locale, design, room % 2 ? "room2.bloom" : "room1.bloom");
            const directions = action(item.directionsAction, locale);
            const telephone = typeof item.phone === "string" ? item.phone : phone;
            const address = localized(item.address, locale);
            return <div className="b3-room" id="b3-room-panel" role={rooms.length > 1 ? "tabpanel" : undefined} aria-labelledby={rooms.length > 1 ? `b3-room-tab-${room}` : undefined} data-qa="bloom-room-panel">
              {image ? <div className="b3-room-photo" key={image.src} data-pan=""><Photo image={image} sizes="(max-width: 760px) 92vw, 58vw" /></div> : null}
              <div className="b3-room-card">
                <h3>{localized(item.name, locale)}</h3>
                <OpenBadge days={placeDays(snapshot, item.id)} now={now} chrome={chrome} locale={locale} habesha={habesha} />
                <p>{address}</p>
                {localized(item.hours, locale) ? <p className="b3-muted">{localized(item.hours, locale)}</p> : null}
                <div className="b3-room-links">
                  <CopyChip text={address} chrome={chrome} />
                  {telephone ? <a className="b3-mini" href={phoneHref(telephone) || `tel:${telephone.replace(/\s+/g, "")}`}><span className="b3-sr">{chrome.t("phone")} </span>{formatPhone(telephone)}</a> : null}
                  {directions ? <a className="b3-mini" href={directions.href} rel="noopener noreferrer">{directions.label}</a> : null}
                </div>
              </div>
            </div>;
          })()}
        </div>
      </section> : null}

      {bookNow ? <section ref={band} className="b3-band" id="book" data-section={bookingAction?.label || bookLabel} aria-labelledby="b3-band-title">
        {(() => { const image = art(booking, locale, design, "band.bloom"); return image ? <div className="b3-band-photo" data-scroll=""><Photo image={image} night={night} sizes="100vw" decorative /></div> : null; })()}
        <div className="b3-wrap b3-band-inner">
          <div className="b3-glass" data-reveal="rise">
            <h2 id="b3-band-title">{localized(booking.title, locale)}</h2>
            {localized(booking.body, locale) ? <p>{localized(booking.body, locale)}</p> : null}
            <BookLink href={bookingAction?.href || bookHref!} label={bookingAction?.label || bookLabel} level={level} qa="bloom-band-book" />
            {data?.next ? <div className="b3-band-live">
              <NextChip facts={{ next: data.next.start, todayLeft: data.todayLeft }} data={data} chrome={chrome} locale={locale} variant="nextFreeChair" />
              {data.todayLeft && data.todayLeft <= 8 ? <p className="b3-left" data-qa="bloom-left-today">{data.todayLeft === 1 ? chrome.t("leftTodayOne") : chrome.t("leftToday", { count: data.todayLeft })}</p> : null}
            </div> : null}
          </div>
        </div>
      </section> : null}
    </main>

    <footer className="b3-footer">
      <p className="b3-footer-word" aria-hidden="true">{word}</p>
      <div className="b3-wrap b3-footer-grid">
        <div>
          <p className="b3-footer-name">{applicationName}</p>
          {localized(footer.body, locale) ? <p className="b3-muted">{localized(footer.body, locale)}</p> : null}
          <OpenBadge days={days} now={now} chrome={chrome} locale={locale} habesha={habesha} />
        </div>
        <ul className="b3-footer-links">
          {menu.length ? <li><a href="#services">{chrome.t("menu")}</a></li> : null}
          {stylists.length ? <li><a href="#team">{chrome.t("team")}</a></li> : null}
          {rooms.length ? <li><a href="#visit">{chrome.t("visit")}</a></li> : null}
          <li><a href={`${publicRoot}/blog`}>{chrome.t("journal")}</a></li>
          <li><a href={`${publicRoot}/gallery`}>{chrome.t("gallery")}</a></li>
        </ul>
        {bookNow ? <div className="b3-footer-book"><BookLink href={bookHref!} label={bookLabel} level={level} magnetic={false} /></div> : null}
      </div>
      <div className="b3-wrap b3-legal">
        <small>© {new Date().getFullYear()} {applicationName}</small>
        {credit ? <p className="b3-credit" lang={locale} data-qa="template-credit">{credit.before}<a href={credit.href} rel="noopener" data-qa="template-credit-link">{credit.product}</a>{credit.after}</p> : null}
      </div>
    </footer>

    {bookNow ? <div className="b3-sticky" data-show={sticky.scrolled && !bandVisible} data-qa="bloom-sticky-book">
      <NextChip facts={data?.next ? { next: data.next.start, todayLeft: data.todayLeft } : null} data={data} chrome={chrome} locale={locale} variant="short" />
      <BookLink href={bookHref!} label={bookLabel} level={level} magnetic={false} />
    </div> : null}
  </div>;
}

/** The printed menu: a row per service with an oversized price; the service photo floats beside the pointer. */
function MenuBoard({ items, locale, chrome, design, data }: { items: ContentRecord[]; locale: string; chrome: PublicChrome; design: TemplateProps["snapshot"]["compiledDesign"]; data: NextAvailability | null }) {
  const [hover, setHover] = useState<number | null>(null);
  const [spot, setSpot] = useState({ x: 0, y: 0 });
  const photos = useMemo(() => items.map((item, index) => art(item, locale, design, `menu${(index % 3) + 1}.bloom`)), [items, locale, design]);
  return <div className="b3-menu" onPointerMove={(event) => {
    if (event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    setSpot({ x: event.clientX - box.left, y: event.clientY - box.top });
  }} onPointerLeave={() => setHover(null)}>
    <ol className="b3-menu-list" data-reveal-stagger="">{items.map((item, index) => {
      const minutes = durationMinutes(item.durationMinutes);
      const price = formatPrice(item.price, item.currency, locale);
      const choose = action(item.action, locale);
      const name = localized(item.name, locale);
      const photo = photos[index];
      const live = typeof item.id === "string" ? data?.services[item.id] : null;
      const body = <>
        {photo ? <span className="b3-menu-thumb" aria-hidden="true"><Photo image={photo} sizes="72px" decorative /></span> : null}
        <span className="b3-menu-name">{name}</span>
        <span className="b3-menu-leader" aria-hidden="true" />
        {price ? <span className="b3-menu-price"><span className="b3-sr">{chrome.t("price")} </span>{price}</span> : null}
        <span className="b3-menu-meta">
          {minutes ? <span><span className="b3-sr">{chrome.t("duration")} </span>{chrome.t("minutes", { count: minutes })}</span> : null}
          {localized(item.summary, locale) ? <span className="b3-menu-summary">{localized(item.summary, locale)}</span> : null}
          {live?.next && data ? <span className="b3-menu-live"><span className="b3-pulse" aria-hidden="true" />{slotText(chrome, live.next, data.timezone, locale)}</span> : null}
        </span>
      </>;
      return <li key={String(item.id || index)} data-reveal="rise" onPointerEnter={() => setHover(index)} onFocus={() => setHover(index)}>
        {choose ? <a className="b3-menu-row" href={choose.href} data-qa={`bloom-menu-row-${index}`}>{body}</a> : <div className="b3-menu-row">{body}</div>}
      </li>;
    })}</ol>
    <div className="b3-float" aria-hidden="true" data-show={hover !== null} style={{ "--fx": `${spot.x}px`, "--fy": `${spot.y}px` } as CSSProperties}>
      {photos.map((photo, index) => photo ? <Photo key={index} image={photo} sizes="260px" decorative className={index === hover ? "is-on" : undefined} /> : null)}
    </div>
  </div>;
}

/** The lookbook rail: native horizontal scroll with snap, arrow buttons and an inner parallax. */
function Rail({ looks, chrome }: { looks: Look[]; chrome: PublicChrome }) {
  const rail = useRef<HTMLUListElement>(null);
  const move = (direction: number) => {
    const node = rail.current;
    if (!node) return;
    const card = node.querySelector("li");
    node.scrollBy({ left: direction * ((card?.getBoundingClientRect().width || 320) + 20), behavior: "smooth" });
  };
  return <div className="b3-rail-wrap" data-reveal="rise">
    <ul className="b3-rail" ref={rail} tabIndex={0} aria-label={chrome.t("lookbook")}>
      {looks.map((look, index) => <li key={look.image.src + index} data-pan="">
        <figure><div className="b3-rail-frame"><Photo image={look.image} sizes="(max-width: 760px) 72vw, 300px" /></div>{look.caption ? <figcaption>{look.caption}</figcaption> : null}</figure>
      </li>)}
    </ul>
    {looks.length > 2 ? <div className="b3-rail-nav">
      <button type="button" className="b3-round" onClick={() => move(-1)} aria-label={chrome.t("previous")}>‹</button>
      <button type="button" className="b3-round" onClick={() => move(1)} aria-label={chrome.t("next")}>›</button>
    </div> : null}
  </div>;
}

/** The template's own loading screen: the mirror stage, drawn while the published design loads. */
export function BloomLoading({ mode, locale = "en" }: { mode: TemplateProps["mode"]; locale?: string }) {
  const chrome = usePublicChrome(locale);
  return <div className="b3 b3-loading" data-pe-mode={mode} data-template="bloom-hair-v3" role="status" aria-busy="true" data-qa="bloom-loading">
    <span className="b3-sr">{chrome.t("loadingSite")}</span>
    <div className="b3-load-bar" aria-hidden="true"><i /><i /><i /></div>
    <div className="b3-wrap b3-load-hero" aria-hidden="true">
      <div className="b3-load-copy"><i className="b3-bone b3-bone-word" /><i className="b3-bone" /><i className="b3-bone b3-bone-short" /><i className="b3-bone b3-bone-btn" /></div>
      <div className="b3-load-mirror"><Bulbs /></div>
    </div>
  </div>;
}

/** A plain click on a booking link moves inside the app, so the booking pages open without a full reload. */
function inApp(event: MouseEvent<HTMLAnchorElement>, href: string, navigate: (to: string) => void) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !href.startsWith("/") || href.startsWith("//")) return;
  event.preventDefault();
  navigate(href);
}

export function BloomBooking({ snapshot, locale, applicationName, publicRoot, rootStyle, bookingPath, mode, toggleMode }: BookingTemplateProps) {
  const chrome = usePublicChrome(locale);
  const navigate = useNavigate();
  const design = snapshot.compiledDesign;
  const root = useRef<HTMLDivElement>(null);
  const level = useBloomMotion(root, design.motion, locale);
  const now = useTimeOfDay();
  const night = useNight(mode, now);
  const live = useLiveAvailability(snapshot, publicRoot);
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const booking = section(snapshot.sections, "booking_cta");
  const label = action(hero.primaryAction, locale)?.label || action(booking.action, locale)?.label || "";
  const image = art(booking, locale, design, "band.bloom");
  const menu = records(services.items);
  const data = live.data;
  return <div ref={root} data-motion={design.motion} data-motion-level={level} data-pe-booking data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode}
    data-night={night} lang={locale} className="b3 b3-handoff" data-template="bloom-hair-v3" style={withAccentInk(rootStyle)}>
    <Bar logo={brandLogo(design)} name={applicationName} root={publicRoot} chrome={chrome} mode={mode} toggleMode={toggleMode} level={level}>
      <a className="b3-link b3-back" href={publicRoot}>{chrome.t("backToSite")}</a>
    </Bar>
    <main className="b3-handoff-stage">
      {image ? <div className="b3-band-photo"><Photo image={image} night={night} eager sizes="100vw" decorative /></div> : null}
      <div className="b3-wrap b3-handoff-grid">
        <div className="b3-glass b3-handoff-panel" data-vt-book="">
          <p className="b3-greet"><span>{greeting(chrome, now)}</span></p>
          <h1>{localized(booking.title, locale)}</h1>
          {localized(booking.body, locale) ? <p>{localized(booking.body, locale)}</p> : null}
          {bookingPath && label ? <a className="b3-btn" href={bookingPath} onClick={(event) => inApp(event, bookingPath, navigate)} data-magnetic="6" data-qa="bloom-handoff-book"><span>{label}</span><span className="b3-btn-arrow" aria-hidden="true">→</span></a> : null}
          {live.status === "loading"
            // The chip's place while the free times load, so the service list below does not move (CLS).
            ? <span className="b3-chip b3-hold" aria-hidden="true" />
            : <NextChip facts={data?.next ? { next: data.next.start, todayLeft: data.todayLeft } : null} data={data} chrome={chrome} locale={locale} variant="nextFreeChair" href={bookingPath || undefined} qa="bloom-handoff-next" />}
        </div>
        {menu.length ? <ol className="b3-handoff-menu" aria-label={localized(services.title, locale) || undefined}>{menu.map((item, index) => {
          const photo = art(item, locale, design, `menu${(index % 3) + 1}.bloom`);
          const price = formatPrice(item.price, item.currency, locale);
          const minutes = durationMinutes(item.durationMinutes);
          const facts = typeof item.id === "string" ? data?.services[item.id] : null;
          // Each row opens its own service in the scheduler, with any stylist.
          const href = (typeof item.id === "string" && snapshot.bookingPaths?.[item.id]) || bookingPath || "";
          const body = <>
            {photo ? <span className="b3-menu-thumb" aria-hidden="true"><Photo image={photo} sizes="72px" decorative /></span> : null}
            <span className="b3-menu-name">{localized(item.name, locale)}</span>
            <span className="b3-menu-meta">{minutes ? chrome.t("minutes", { count: minutes }) : null}{price ? <> · {price}</> : null}
              {facts?.next && data ? <span className="b3-menu-live"><span className="b3-pulse" aria-hidden="true" />{slotText(chrome, facts.next, data.timezone, locale)}</span>
                : live.status === "loading" ? <span className="b3-menu-live b3-hold" aria-hidden="true">&nbsp;</span> : null}</span>
            {href ? <span className="b3-handoff-go" aria-hidden="true">→</span> : null}
          </>;
          return <li key={String(item.id || index)} data-reveal="rise">
            {href ? <a className="b3-handoff-row" href={href} onClick={(event) => inApp(event, href, navigate)} data-qa={`bloom-handoff-service-${index}`}>{body}</a>
              : <div className="b3-handoff-row">{body}</div>}
          </li>;
        })}</ol> : null}
      </div>
    </main>
  </div>;
}
