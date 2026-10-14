/**
 * The app's phone controls. Every phone field uses one of these two:
 *
 * - `PhoneInput`: one number. It accepts every form `lib/phone.ts` accepts,
 *   shows the shared hint when the number does not fit, and shows the number in
 *   its display form when the field loses focus.
 * - `PhoneTagsInput`: several numbers as tags on one line. Enter, a comma, Tab
 *   or leaving the field turns a valid number into a shaded tag. Backspace in the
 *   empty field removes the last tag. Pasting several numbers adds each of them.
 *
 * Both send E.164 numbers ("+251911223344") through `normalizePhone`; the server
 * checks them again with the same rules.
 */
import * as React from "react";
import { X } from "lucide-react";
import { Input } from "@/components/input";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { formatPhone, normalizePhone, phoneHref, splitPhones } from "@/lib/phone";

type InputProps = Omit<React.ComponentProps<"input">, "value" | "onChange" | "type">;

export interface PhoneInputProps extends InputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called with true while the field is empty-and-optional or holds a usable number. */
  onValidityChange?: (valid: boolean) => void;
  /** Show the error now, for example after a submit attempt. */
  showError?: boolean;
  /** Text under the field while there is no error. */
  help?: React.ReactNode;
  errorClassName?: string;
  errorStyle?: React.CSSProperties;
  helpClassName?: string;
  helpStyle?: React.CSSProperties;
  /** False when the form shows the error and help itself (pass `aria-describedby`). */
  messages?: boolean;
  "data-qa"?: string;
}

/** The message for a single phone value, or "" when it is fine. */
export function usePhoneProblem() {
  const { t } = useTranslation();
  return (value: string, required: boolean) => {
    if (!value.trim()) return required ? t("controls.phone.required") : "";
    return normalizePhone(value) ? "" : t("controls.phone.hint");
  };
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  {
    value, onChange, onValidityChange, showError = false, help, required, id, className, onBlur,
    errorClassName, errorStyle, helpClassName, helpStyle, placeholder, messages = true, "data-qa": qa,
    "aria-describedby": describedByCaller, ...rest
  },
  ref,
) {
  const { t } = useTranslation();
  const problemOf = usePhoneProblem();
  const generated = React.useId();
  const inputId = id || generated;
  const [touched, setTouched] = React.useState(false);
  const problem = problemOf(value, Boolean(required));
  const shown = (touched || showError) && problem;
  const validity = React.useRef(onValidityChange);
  validity.current = onValidityChange;
  React.useEffect(() => validity.current?.(!problem), [problem]);
  const describedBy = !messages ? describedByCaller : shown ? `${inputId}-error` : help ? `${inputId}-help` : undefined;
  return (
    <>
      <Input
        ref={ref}
        id={inputId}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        maxLength={30}
        value={value}
        aria-required={required || undefined}
        placeholder={placeholder ?? t("controls.phone.placeholder")}
        aria-invalid={shown ? true : undefined}
        aria-describedby={describedBy}
        data-qa={qa}
        className={cn(shown && "border-destructive focus-visible:ring-destructive", className)}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => {
          setTouched(true);
          // Show the number the way the business will see it.
          if (normalizePhone(value)) onChange(formatPhone(value));
          onBlur?.(event);
        }}
        {...rest}
      />
      {!messages ? null : shown ? (
        <p id={`${inputId}-error`} role="alert" data-qa={qa ? `${qa}-error` : undefined}
          className={cn("text-sm text-destructive", errorClassName)} style={errorStyle}>
          {problem}
        </p>
      ) : help ? (
        <p id={`${inputId}-help`} className={cn("text-sm text-muted-foreground", helpClassName)} style={helpStyle}>{help}</p>
      ) : null}
    </>
  );
});

export interface PhoneTagsInputProps {
  /** E.164 numbers already added. */
  value: string[];
  onChange: (value: string[]) => void;
  /** Called with false while the field holds text that is not a phone number yet. */
  onValidityChange?: (valid: boolean) => void;
  /** The main contact's number; it is not added again. */
  exclude?: string;
  max?: number;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  help?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  inputClassName?: string;
  errorClassName?: string;
  errorStyle?: React.CSSProperties;
  helpClassName?: string;
  helpStyle?: React.CSSProperties;
  "aria-labelledby"?: string;
  "data-qa"?: string;
}

export function PhoneTagsInput({
  value, onChange, onValidityChange, exclude, max = 10, id, disabled, placeholder, help, className, style,
  inputClassName, errorClassName, errorStyle, helpClassName, helpStyle, "aria-labelledby": labelledBy, "data-qa": qa = "phone-tags",
}: PhoneTagsInputProps) {
  const { t } = useTranslation();
  const generated = React.useId();
  const inputId = id || generated;
  const input = React.useRef<HTMLInputElement>(null);
  const [draft, setDraft] = React.useState("");
  const [problem, setProblem] = React.useState("");
  const [announcement, setAnnouncement] = React.useState("");
  const own = normalizePhone(exclude);
  const validity = React.useRef(onValidityChange);
  validity.current = onValidityChange;
  React.useEffect(() => validity.current?.(!draft.trim()), [draft]);

  /** Add every usable number in `text`; return what is left to fix (or ""). */
  function commit(text: string): string {
    const parts = splitPhones(text);
    const next = [...value];
    let left = "";
    let message = "";
    for (const part of parts) {
      const number = normalizePhone(part);
      if (!number) {
        left = left ? `${left}, ${part}` : part;
        message = t("controls.phone.hint");
      } else if (number === own) {
        message = t("controls.phone.ownNumber");
      } else if (next.includes(number)) {
        message = t("controls.phone.duplicate");
      } else if (next.length >= max) {
        left = left ? `${left}, ${part}` : part;
        message = t("controls.phone.max").replace("{0}", String(max));
      } else {
        next.push(number);
        setAnnouncement(t("controls.phone.added").replace("{0}", formatPhone(number)));
      }
    }
    if (next.length !== value.length) onChange(next);
    setProblem(message);
    setDraft(left);
    return left;
  }

  function remove(number: string) {
    onChange(value.filter((item) => item !== number));
    setAnnouncement(t("controls.phone.removed").replace("{0}", formatPhone(number)));
    input.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if ((event.key === "Enter" || event.key === ",") && draft.trim()) {
      event.preventDefault();
      commit(draft);
    } else if (event.key === "Enter") {
      event.preventDefault(); // An empty tag field never submits the form.
    } else if (event.key === "Tab" && draft.trim() && normalizePhone(draft)) {
      commit(draft);
    } else if (event.key === "Backspace" && !draft && value.length) {
      event.preventDefault();
      remove(value[value.length - 1]);
    }
  }

  function onTextChange(text: string) {
    if (/[,;\n]/.test(text)) {
      commit(text);
      return;
    }
    setDraft(text);
    if (problem && (!text.trim() || normalizePhone(text))) setProblem("");
  }

  const describedBy = problem ? `${inputId}-error` : help ? `${inputId}-help` : undefined;
  return (
    <div className="space-y-1.5">
      <div
        data-qa={qa}
        style={style}
        className={cn(
          "flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-base ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 md:text-sm",
          problem && "border-destructive focus-within:ring-destructive",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
        onClick={() => input.current?.focus()}
      >
        <ul className="contents" aria-label={t("controls.phone.list")}>
          {value.map((number) => (
            <li
              key={number}
              data-qa={`${qa}-tag`}
              data-phone={number}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-[color-mix(in_srgb,currentColor_22%,transparent)] bg-[color-mix(in_srgb,currentColor_10%,transparent)] py-0.5 pl-2.5 pr-1 text-sm font-medium tabular-nums"
            >
              <span dir="ltr">{formatPhone(number)}</span>
              <button
                type="button"
                disabled={disabled}
                data-qa={`${qa}-remove`}
                aria-label={t("controls.phone.remove").replace("{0}", formatPhone(number))}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full opacity-70 hover:bg-[color-mix(in_srgb,currentColor_16%,transparent)] hover:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                onClick={(event) => { event.stopPropagation(); remove(number); }}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
              {/* The comma the owner asked for: tags read as a list, and copy as one. */}
              <span className="sr-only">,</span>
            </li>
          ))}
        </ul>
        <input
          ref={input}
          id={inputId}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          enterKeyHint="enter"
          maxLength={200}
          disabled={disabled || value.length >= max}
          value={draft}
          placeholder={value.length ? t("controls.phone.tagsMore") : placeholder ?? t("controls.phone.tagsPlaceholder")}
          aria-labelledby={labelledBy}
          aria-invalid={problem ? true : undefined}
          aria-describedby={describedBy}
          data-qa={`${qa}-input`}
          // The field around the tags shows the focus ring; a second outline on the inner input looks broken.
          style={{ outline: "none" }}
          className={cn("h-7 min-w-[10rem] flex-1 bg-transparent px-1 outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed", inputClassName)}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (splitPhones(text).length > 1) {
              event.preventDefault();
              commit(draft ? `${draft},${text}` : text);
            }
          }}
          onBlur={() => { if (draft.trim()) commit(draft); }}
        />
      </div>
      {problem ? (
        <p id={`${inputId}-error`} role="alert" data-qa={`${qa}-error`} className={cn("text-sm text-destructive", errorClassName)} style={errorStyle}>{problem}</p>
      ) : help ? (
        <p id={`${inputId}-help`} className={cn("text-sm text-muted-foreground", helpClassName)} style={helpStyle}>{help}</p>
      ) : null}
      <span className="sr-only" aria-live="polite">{announcement}</span>
    </div>
  );
}

/** Stored phone list text ("one per line") from tags, for APIs that take text. */
export function phonesToText(numbers: string[]): string {
  return numbers.join(",");
}

/** A stored phone number for reading: the display form, as a `tel:` link when it is usable. */
export function PhoneText({ value, link = true, className }: { value?: string | null; link?: boolean; className?: string }) {
  if (!value) return null;
  const href = link ? phoneHref(value) : "";
  const text = formatPhone(value);
  return href
    ? <a href={href} dir="ltr" className={cn("tabular-nums underline-offset-4 hover:underline", className)}>{text}</a>
    : <span dir="ltr" className={cn("tabular-nums", className)}>{text}</span>;
}
