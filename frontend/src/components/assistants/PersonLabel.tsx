/**
 * A person in the assistants and tasks area: initials avatar, display name and,
 * when useful, the email as secondary detail. Profiles are named after the
 * user's email, so `name` falls back to the id when the API sent no name.
 */
import { cn } from '@/lib/utils';

type Size = 'xs' | 'sm' | 'md' | 'lg';
type Tone = 'primary' | 'secondary';

const AVATAR_SIZE: Record<Size, string> = {
  xs: 'w-5 h-5 text-[9px] rounded-full',
  sm: 'w-7 h-7 text-[11px] rounded-full',
  md: 'w-10 h-10 text-sm rounded-lg',
  lg: 'w-12 h-12 text-base rounded-xl',
};

const TONE: Record<Tone, string> = {
  primary: 'bg-gradient-primary',
  secondary: 'bg-gradient-secondary',
};

interface PersonAvatarProps {
  name: string;
  size?: Size;
  tone?: Tone;
  className?: string;
}

export function PersonAvatar({ name, size = 'sm', tone = 'primary', className }: PersonAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-bold text-white',
        AVATAR_SIZE[size],
        TONE[tone],
        className
      )}
    >
      {personInitials(name)}
    </span>
  );
}

interface PersonLabelProps {
  /** Display name; falls back to `id`. */
  name?: string | null;
  /** Profile id (the email). Shown under the name when `showEmail` is set and it differs. */
  id?: string | null;
  showEmail?: boolean;
  size?: Size;
  tone?: Tone;
  className?: string;
  nameClassName?: string;
}

export function PersonLabel({
  name,
  id,
  showEmail = false,
  size = 'sm',
  tone = 'primary',
  className,
  nameClassName,
}: PersonLabelProps) {
  const label = personName(name, id);
  const email = showEmail && id && id !== label ? id : '';
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)} title={id || undefined}>
      <PersonAvatar name={label} size={size} tone={tone} />
      <span className="flex min-w-0 flex-col">
        <span className={cn('truncate', nameClassName)} data-qa="person-name">
          {label}
        </span>
        {email && (
          <span className="truncate text-xs font-normal" style={{ color: 'var(--text-muted)' }} data-qa="person-email">
            {email}
          </span>
        )}
      </span>
    </span>
  );
}

/** The name to show: the display name, else the id, else an empty string. */
export const personName = (name?: string | null, id?: string | null) => (name || id || '').trim();

/** Up to two initials; an email falls back to its first letter. */
export const personInitials = (name: string) => {
  const words = name.includes('@') ? [name] : name.split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toUpperCase() || '?';
};
