import { AnimatePresence, motion } from "framer-motion";
import { useRef, useState } from "react";
import { useBrandedTranslation } from "@/lib/platform-brand";
import { useStoryStep } from "./useStoryStep";

type Lang = "en" | "am";

/**
 * Sample screens in both languages. They are demonstration content that must show
 * both languages whatever the visitor's own language is, so they are not catalog keys.
 * 9:00 AM is 3:00 on the Habesha clock; 16 September is መስከረም 6 in the Ethiopian calendar.
 */
const SAMPLE: Record<Lang, {
  business: string; book: string; date: string; dateOther: string; slots: [string, string][];
  confirm: string; smsFrom: string; sms: string; staffTitle: string; staffRows: [string, string][]; toast: string;
}> = {
  en: {
    business: "Beza Beauty Salon",
    book: "Book an appointment",
    date: "16 September",
    dateOther: "መስከረም 6",
    slots: [["9:00 AM", "3:00 ጠዋት"], ["10:30 AM", "4:30 ጠዋት"], ["2:00 PM", "8:00 ከሰዓት"]],
    confirm: "Confirm 9:00 AM",
    smsFrom: "Beza Beauty Salon",
    sms: "Hi Helen, see you tomorrow at 9:00 AM (3:00 Habesha time) for braids. Reply 1 to confirm.",
    staffTitle: "Today's bookings",
    staffRows: [["9:00", "Helen · braids"], ["10:30", "Saba · blow-dry"]],
    toast: "Booking confirmed",
  },
  am: {
    business: "ቤዛ የውበት ሳሎን",
    book: "ቀጠሮ ይያዙ",
    date: "መስከረም 6",
    dateOther: "16 September",
    slots: [["3:00 ጠዋት", "9:00 AM"], ["4:30 ጠዋት", "10:30 AM"], ["8:00 ከሰዓት", "2:00 PM"]],
    confirm: "ጠዋት 3:00 ያረጋግጡ",
    smsFrom: "ቤዛ የውበት ሳሎን",
    sms: "ሰላም ሔለን፣ ነገ ጠዋት 3:00 ሰዓት (9:00 AM) ለሹሩባ እንጠብቅዎታለን። ለማረጋገጥ 1 ብለው ይመልሱ።",
    staffTitle: "የዛሬ ቀጠሮዎች",
    staffRows: [["3:00", "ሔለን · ሹሩባ"], ["4:30", "ሳባ · ብሎ ድራይ"]],
    toast: "ቀጠሮው ተረጋግጧል",
  },
};

/** One booking seen in both languages: the booking page, the reminder and the staff app. */
const AmharicStage = () => {
  const { t } = useBrandedTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const story = useStoryStep(ref, 2, 3200);
  const [picked, setPicked] = useState<Lang | null>(null);
  const lang: Lang = picked ?? (story === 1 ? "am" : "en");
  const sample = SAMPLE[lang];
  const swap = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.35 } };

  return (
    <div ref={ref} className="lw-amharic" data-lang={lang}>
      <div className="lw-seg" role="group" aria-label={t("world.amharic.toggle")}>
        <button type="button" aria-pressed={lang === "en"} onClick={() => setPicked("en")} data-qa="landing-amharic-en">English</button>
        <button type="button" aria-pressed={lang === "am"} onClick={() => setPicked("am")} lang="am" data-qa="landing-amharic-am">አማርኛ</button>
      </div>
      <div className="lw-amharic-grid" lang={lang} data-qa="landing-amharic-sample">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={lang} className="lw-amharic-screens" {...swap}>
            <section className="lw-am-card lw-am-page" aria-label={t("world.amharic.page")}>
              <p className="lw-mono-sm">{t("world.amharic.page")}</p>
              <strong className="lw-am-business">{sample.business}</strong>
              <span className="lw-am-book">{sample.book}</span>
              <p className="lw-am-date">
                <b>{sample.date}</b>
                <span>{sample.dateOther}</span>
              </p>
              <ul className="lw-am-slots">
                {sample.slots.map(([main, other], index) => (
                  <li key={main} data-on={index === 0}>
                    <b>{main}</b>
                    <small>{other}</small>
                  </li>
                ))}
              </ul>
              <span className="lw-am-confirm">{sample.confirm}</span>
            </section>
            <section className="lw-am-card lw-am-sms" aria-label={t("world.amharic.reminder")}>
              <p className="lw-mono-sm">{t("world.amharic.reminder")}</p>
              <span className="lw-am-from">{sample.smsFrom}</span>
              <p className="lw-am-bubble">{sample.sms}</p>
            </section>
            <section className="lw-am-card lw-am-staff" aria-label={t("world.amharic.staff")}>
              <p className="lw-mono-sm">{t("world.amharic.staff")}</p>
              <strong>{sample.staffTitle}</strong>
              <ul>
                {sample.staffRows.map(([time, who]) => (
                  <li key={time}><span className="lw-am-time">{time}</span>{who}</li>
                ))}
              </ul>
              <span className="lw-am-toast">✓ {sample.toast}</span>
            </section>
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="lw-caption">{t("world.amharic.caption")}</p>
    </div>
  );
};

export default AmharicStage;
