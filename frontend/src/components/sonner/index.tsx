import { Toaster as Sonner } from "sonner"
import { useTheme } from "@/components/theme-provider"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          // Sonner sets its own system font stack; font-sans brings back Noto Sans Ethiopic for Amharic.
          // Sonner's own styles are not in a cascade layer, so they beat Tailwind 4
          // utilities; the `!` keeps the theme colours that won in Tailwind 3.
          toast:
            "group toast font-sans group-[.toaster]:bg-background! group-[.toaster]:text-foreground! group-[.toaster]:border-border! group-[.toaster]:shadow-lg!",
          description: "group-[.toast]:text-muted-foreground!",
          actionButton:
            "group-[.toast]:bg-primary! group-[.toast]:text-primary-foreground!",
          cancelButton:
            "group-[.toast]:bg-muted! group-[.toast]:text-muted-foreground!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
