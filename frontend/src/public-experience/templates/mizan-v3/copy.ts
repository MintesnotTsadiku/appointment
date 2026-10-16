import { useEffect, useState } from "react";
import { getTranslation } from "@/lib/i18n";
import { loadChromeMessages } from "../chrome";

export function useMizanCopy(locale: string) {
  const [messages, setMessages] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    loadChromeMessages(locale).then((value) => {
      if (active) setMessages(value);
    });
    return () => {
      active = false;
    };
  }, [locale]);
  return (key: string) =>
    getTranslation(locale, `publicSite.mizan.${key}`, messages);
}
