import type { ReactNode } from "react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./index"

export interface SelectOption {
  value: string
  label: ReactNode
  disabled?: boolean
}

export interface OptionSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: ReactNode
  id?: string
  disabled?: boolean
  required?: boolean
  className?: string
  contentClassName?: string
  "data-qa"?: string
  "aria-label"?: string
  "aria-labelledby"?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
}

// Radix reserves "" for "no value"; an explicit empty option (All, None) maps to this token.
const EMPTY = "__empty__"
const encode = (value: string) => (value === "" ? EMPTY : value)
const decode = (value: string) => (value === EMPTY ? "" : value)

/**
 * The standard single-choice dropdown: a shadcn Select fed an options list.
 * Each option carries `data-value` so browser QA can pick it by value.
 */
export function OptionSelect({ value, onValueChange, options, placeholder, id, disabled, required, className, contentClassName, ...aria }: OptionSelectProps) {
  const hasEmpty = options.some((option) => option.value === "")
  const current = value === "" && !hasEmpty ? "" : encode(value)
  return (
    <Select value={current} onValueChange={(next) => onValueChange(decode(next))} disabled={disabled} required={required}>
      <SelectTrigger id={id} className={className} data-qa={aria["data-qa"]} data-value={value}
        aria-label={aria["aria-label"]} aria-labelledby={aria["aria-labelledby"]} aria-invalid={aria["aria-invalid"]} aria-describedby={aria["aria-describedby"]}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {options.map((option) => (
          <SelectItem key={option.value || EMPTY} value={encode(option.value)} disabled={option.disabled} data-value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
