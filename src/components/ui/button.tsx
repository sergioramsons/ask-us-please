import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-gradient-primary text-primary-foreground hover:shadow-lg hover:shadow-colored/20 hover:scale-105 active:scale-95",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-lg hover:scale-105 active:scale-95",
        outline: "border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-accent/80 hover:text-accent-foreground shadow-sm hover:shadow-md hover:scale-105 active:scale-95",
        secondary: "bg-gradient-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md hover:scale-105 active:scale-95",
        ghost: "hover:bg-accent/80 hover:text-accent-foreground hover:scale-105 active:scale-95",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "bg-gradient-hero text-primary-foreground shadow-lg hover:shadow-xl hover:shadow-colored/30 hover:scale-110 active:scale-95 font-semibold",
        glass: "bg-card/30 backdrop-blur-xl border border-border/20 text-foreground hover:bg-card/50 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95",
        modern: "bg-card border border-border/50 text-foreground shadow-md hover:shadow-lg hover:border-primary/50 hover:scale-105 active:scale-95",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-sm hover:shadow-lg hover:scale-105 active:scale-95",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm hover:shadow-lg hover:scale-105 active:scale-95",
        info: "bg-info text-info-foreground hover:bg-info/90 shadow-sm hover:shadow-lg hover:scale-105 active:scale-95",
        freshdesk: "bg-gradient-primary text-primary-foreground hover:shadow-lg hover:shadow-colored/20 hover:scale-105 active:scale-95 font-semibold"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        xl: "h-14 px-10 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12"
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
