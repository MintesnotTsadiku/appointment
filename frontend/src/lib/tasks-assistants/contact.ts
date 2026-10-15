/**
 * Ways to reach a person from their stored phone (E.164, e.g. "+251911524011")
 * and email. Channels without the data they need are left out.
 */
export type ContactChannel = 'call' | 'sms' | 'whatsapp' | 'telegram' | 'email';

export interface ContactLink {
  channel: ContactChannel;
  href: string;
  /** Opens a web page, so it goes to a new tab. */
  external: boolean;
}

export interface ContactDetails {
  phone?: string | null;
  email?: string | null;
}

export function contactLinks({ phone, email }: ContactDetails): ContactLink[] {
  const dial = dialable(phone);
  const e164 = dial && E164.test(dial) ? dial : '';
  const mail = (email || '').trim();
  const links: (ContactLink | false)[] = [
    !!dial && { channel: 'call', href: `tel:${dial}`, external: false },
    !!dial && { channel: 'sms', href: `sms:${dial}`, external: false },
    !!e164 && { channel: 'whatsapp', href: `https://wa.me/${e164.slice(1)}`, external: true },
    // Telegram opens a chat by phone number when the person allows it.
    !!e164 && { channel: 'telegram', href: `https://t.me/${e164}`, external: true },
    EMAIL.test(mail) && { channel: 'email', href: `mailto:${mail}`, external: false },
  ];
  return links.filter((link): link is ContactLink => !!link);
}

const E164 = /^\+[1-9]\d{7,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The phone without spaces or punctuation; "" when it has too few digits to dial. */
function dialable(phone?: string | null): string {
  const value = (phone || '').trim().replace(/[^\d+]/g, '');
  return value.replace(/\D/g, '').length >= 7 ? value : '';
}
