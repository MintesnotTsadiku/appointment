/**
 * "Message" button for a person: a menu of the channels their contact details
 * allow (call, SMS, WhatsApp, Telegram, email). Disabled with a tooltip when
 * there is none.
 */
import { Mail, MessageCircle, MessageSquare, Phone, Send, type LucideIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { useTranslation } from '@/lib/i18n';
import { contactLinks, type ContactChannel, type ContactDetails } from '@/lib/tasks-assistants/contact';

const ICONS: Record<ContactChannel, LucideIcon> = {
  call: Phone,
  sms: MessageSquare,
  whatsapp: MessageCircle,
  telegram: Send,
  email: Mail,
};

const NEW_TAB = { target: '_blank', rel: 'noopener noreferrer' };

const BUTTON_CLASS =
  'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border border-theme-default bg-theme-elevated text-theme-primary hover:bg-theme-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] disabled:cursor-not-allowed disabled:opacity-50';

export function ContactMenu(details: ContactDetails) {
  const { t } = useTranslation();
  const links = contactLinks(details);
  const button = (
    <button type="button" className={BUTTON_CLASS} disabled={!links.length} data-qa="assistant-contact">
      <MessageSquare className="w-4 h-4" />
      {t('assistants.va.detail.message')}
    </button>
  );

  if (!links.length) {
    return (
      <Tooltip>
        {/* A disabled button gets no pointer events, so the span carries the tooltip. */}
        <TooltipTrigger asChild>
          <span tabIndex={0}>{button}</span>
        </TooltipTrigger>
        <TooltipContent>{t('assistants.contact.none')}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{button}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="min-w-44" data-qa="assistant-contact-menu">
        {links.map(({ channel, href, external }) => {
          const Icon = ICONS[channel];
          return (
            <DropdownMenuItem key={channel} asChild>
              <a
                href={href}
                {...(external ? NEW_TAB : {})}
                data-qa={`assistant-contact-${channel}`}
              >
                <Icon />
                {t(`assistants.contact.${channel}`)}
              </a>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
