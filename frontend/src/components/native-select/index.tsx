import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * shadcn-styled native <select>. Use it where the platform picker is better
 * (mobile, long option lists) or where browser QA drives a real select.
 */
const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }>(
  ({ className, wrapperClassName, children, ...props }, ref) => (
    <div className={cn("relative", wrapperClassName)}>
      <select
        ref={ref}
        className={cn(
          "flex h-10 w-full appearance-none truncate rounded-md border border-input bg-background py-2 pl-3 pr-9 text-sm text-foreground ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
)
NativeSelect.displayName = "NativeSelect"

export { NativeSelect }
