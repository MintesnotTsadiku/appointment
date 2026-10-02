import { Languages, Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { useTheme } from '@/components/theme-provider';
import { useTranslation } from '@/lib/i18n';

const THEME_ORDER = { light: 'dark', dark: 'system', system: 'light' } as const;
const THEME_LABEL = { light: 'staff.shell.themeLight', dark: 'staff.shell.themeDark', system: 'staff.shell.themeSystem' } as const;
const LANGUAGE_LABEL: Record<string, string> = { en: 'EN', am: 'አማ' };

/** Cycles light → dark → system; QA manifests rely on this order. */
export function ThemeButton() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const current = (theme in THEME_ORDER ? theme : 'system') as keyof typeof THEME_ORDER;
  const Icon = current === 'light' ? Sun : current === 'dark' ? Moon : Monitor;
  const label = `${t('staff.shell.theme')}: ${t(THEME_LABEL[current])}`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={() => setTheme(THEME_ORDER[current])}
          aria-label={label}
          data-qa="topnav-theme"
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function LanguageButton() {
  const { language, setLanguage, languages, t } = useTranslation();
  const available = languages.length ? languages : ['en', 'am'];
  const next = available[(available.indexOf(language) + 1) % available.length];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
          onClick={() => setLanguage(next)}
          aria-label={`${t('staff.shell.language')} (${LANGUAGE_LABEL[language] ?? language})`}
          data-qa="topnav-language"
        >
          <Languages />
          <span className="text-xs font-semibold">{LANGUAGE_LABEL[language] ?? language.toUpperCase()}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t('staff.shell.language')}</TooltipContent>
    </Tooltip>
  );
}
