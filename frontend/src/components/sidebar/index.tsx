import * as React from "react"
import { Slot } from "@radix-ui/react-slot"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/tooltip"

/** Collapsed state is shared so menu buttons can switch to icon-only with tooltips. */
const SidebarContext = React.createContext<{ collapsed: boolean }>({ collapsed: false })

const useSidebar = () => React.useContext(SidebarContext)

const Sidebar = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement> & { collapsed?: boolean }>(
  ({ className, collapsed = false, children, ...props }, ref) => (
    <SidebarContext.Provider value={{ collapsed }}>
      <aside
        ref={ref}
        data-collapsed={collapsed || undefined}
        className={cn("flex h-full flex-col bg-sidebar text-sidebar-foreground", className)}
        {...props}
      >
        {children}
      </aside>
    </SidebarContext.Provider>
  )
)
Sidebar.displayName = "Sidebar"

const SidebarHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-2 p-3", className)} {...props} />
)

const SidebarContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-3 py-2", className)} {...props} />
)

const SidebarFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-2 border-t p-3", className)} {...props} />
)

const SidebarGroup = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1 py-1", className)} {...props} />
)

const SidebarGroupLabel = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  const { collapsed } = useSidebar()
  if (collapsed) return <div className="mx-2 my-2 h-px bg-border" aria-hidden="true" />
  return <div className={cn("px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground", className)} {...props} />
}

const SidebarMenu = ({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
  <ul className={cn("flex flex-col gap-0.5", className)} {...props} />
)

const SidebarMenuItem = ({ className, ...props }: React.LiHTMLAttributes<HTMLLIElement>) => (
  <li className={cn("relative", className)} {...props} />
)

interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string
}

const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ asChild, isActive, tooltip, className, ...props }, ref) => {
    const { collapsed } = useSidebar()
    const Comp = asChild ? Slot : "button"
    const button = (
      <Comp
        ref={ref}
        data-active={isActive || undefined}
        className={cn(
          "flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-sm font-medium text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[active]:bg-accent data-[active]:text-accent-foreground [&_svg]:size-[18px] [&_svg]:shrink-0",
          collapsed && "justify-center px-0",
          className
        )}
        {...props}
      />
    )
    if (!collapsed || !tooltip) return button
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">{tooltip}</TooltipContent>
      </Tooltip>
    )
  }
)
SidebarMenuButton.displayName = "SidebarMenuButton"

export {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
}
