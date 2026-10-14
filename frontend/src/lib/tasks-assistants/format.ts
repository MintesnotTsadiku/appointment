/**
 * Locale-aware labels and formats for the Tasks & Assistants area.
 *
 * Stored values (task status, priority, assistant tier, …) never change; only
 * their display labels are translated. Dates use the app's Intl locale and
 * times follow the language's clock: Amharic screens show Ethiopian local time
 * with its period (ጠዋት, ከሰዓት, ምሽት, ሌሊት), English screens a 24-hour clock.
 */
import { useMemo } from 'react';
import { intlLocale, useTranslation } from '@/lib/i18n';
import { GatewayServerError } from '@/lib/apiGateway';
import { clockForLanguage, formatInstant, toEthiopian, wallPartsInZone } from '@/lib/time';

type Translate = (key: string) => string;

/** Parse an API date or datetime ("2026-10-15", "2026-10-15 14:00:00", ISO). */
export const parseApiDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = value.trim();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(text);
  const date = new Date(dateOnly ? `${text}T00:00:00` : text.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
};

const camel = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_match, next: string) => next.toUpperCase());

const ENUM_ALIASES: Record<string, string> = { canceled: 'cancelled', paused: 'inactive' };

/** Translate a stored enum value; unknown values are shown as stored. */
export const enumLabel = (t: Translate, group: string, value?: string | null): string => {
  if (!value) return '';
  const name = camel(value);
  const key = `${group}.${ENUM_ALIASES[name] ?? name}`;
  const label = t(key);
  return label === key ? value : label;
};

const MODEL_KEYS: Record<string, string> = { '1:1': 'oneToOne', '1:2': 'oneToTwo', '1:3': 'oneToThree' };

export const createTaskFormat = (language: string, t: Translate) => {
  const locale = intlLocale(language);
  const clock = clockForLanguage(language, '24h');

  const date = (value?: string | Date | null, options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }) => {
    const parsed = parseApiDate(value);
    return parsed ? new Intl.DateTimeFormat(locale, options).format(parsed) : '';
  };

  /** Clock time; `compact` drops the leading "ሰዓት" of Ethiopian time for tight cells. */
  const time = (value?: string | Date | null, compact = false) => {
    const parsed = parseApiDate(value);
    if (!parsed) return '';
    if (clock === 'ethiopian' && compact) {
      const { hour, minute } = wallPartsInZone(parsed);
      const local = toEthiopian(hour, minute);
      return `${local.hour}:${String(local.minute).padStart(2, '0')} ${local.period}`;
    }
    return formatInstant(parsed, clock);
  };

  const dateTime = (value?: string | Date | null) => {
    const parsed = parseApiDate(value);
    if (!parsed) return '';
    return `${date(parsed)}, ${time(parsed)}`;
  };

  const number = (value?: number | null, options?: Intl.NumberFormatOptions) =>
    value == null || Number.isNaN(value) ? '' : new Intl.NumberFormat(locale, options).format(value);

  const duration = (minutes?: number | null) => {
    if (!minutes) return '';
    if (minutes < 60) return t('tasks.common.durationMinutes').replace('{0}', number(minutes));
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest
      ? t('tasks.common.durationHoursMinutes').replace('{0}', number(hours)).replace('{1}', number(rest))
      : t('tasks.common.durationHours').replace('{0}', number(hours));
  };

  return {
    locale,
    date,
    time,
    dateTime,
    number,
    duration,
    taskStatus: (value?: string | null) => enumLabel(t, 'tasks.status', value || 'Requested'),
    taskPriority: (value?: string | null) => enumLabel(t, 'tasks.priority', value || 'Medium'),
    profileStatus: (value?: string | null) => enumLabel(t, 'assistants.status', value),
    tier: (value?: string | null) => enumLabel(t, 'assistants.tier', value),
    availability: (value?: string | null) => enumLabel(t, 'assistants.availability', value),
    workStyle: (value?: string | null) => enumLabel(t, 'assistants.workStyle', value),
    responseTime: (value?: string | null) => enumLabel(t, 'assistants.responseTime', value),
    proficiency: (value?: string | null) => enumLabel(t, 'assistants.proficiency', value),
    model: (value?: string | null) => (value && MODEL_KEYS[value] ? t(`assistants.model.${MODEL_KEYS[value]}`) : value || ''),
  };
};

export type TaskFormat = ReturnType<typeof createTaskFormat>;

/** Labels and formats for the active language. */
export const useTaskFormat = (): TaskFormat => {
  const { language, t } = useTranslation();
  return useMemo(() => createTaskFormat(language, t), [language, t]);
};

/**
 * The message to show for a failed call: the server's own (translated) message
 * when it raised one, otherwise the given translated fallback. Transport errors
 * ("HTTP error", "Request failed") are never shown to the user.
 */
export const serverError = (error: unknown, fallback: string): string =>
  error instanceof GatewayServerError && error.message ? error.message : fallback;

/**
 * A date as the wall-clock `YYYY-MM-DDTHH:mm` the task API stores (site time).
 * `toISOString()` would shift it to UTC and move the deadline on every save.
 */
export const toApiDateTime = (value?: Date | string | null): string => {
  const date = parseApiDate(value);
  if (!date) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
