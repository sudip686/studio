import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold tracking-[-0.01em] ring-offset-background transition-[transform,background-color,border-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(204,90,40,0.38)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(8,10,14,0.96)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.99] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border border-[rgba(255,243,236,0.24)] bg-[linear-gradient(135deg,rgba(230,116,59,1),rgba(247,188,90,0.96))] text-[rgba(16,10,8,0.96)] shadow-[0_18px_40px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.24)] hover:-translate-y-px hover:brightness-[1.03] hover:shadow-[0_22px_48px_rgba(0,0,0,0.34)]",
        destructive:
          "border border-[rgba(248,113,113,0.35)] bg-[linear-gradient(180deg,rgba(127,29,29,0.92),rgba(69,10,10,0.96))] text-white hover:border-[rgba(248,113,113,0.5)] hover:bg-[linear-gradient(180deg,rgba(153,27,27,0.92),rgba(87,12,12,0.98))]",
        outline:
          "border border-[rgba(255,239,229,0.14)] bg-[rgba(255,255,255,0.05)] text-[rgba(255,250,247,0.94)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:-translate-y-px hover:border-[rgba(241,210,191,0.28)] hover:bg-[rgba(255,255,255,0.08)]",
        secondary:
          "border border-[rgba(255,239,229,0.12)] bg-[linear-gradient(180deg,rgba(40,28,22,0.88),rgba(16,12,10,0.92))] text-[rgba(255,248,242,0.94)] shadow-[0_10px_28px_rgba(0,0,0,0.24)] hover:-translate-y-px hover:border-[rgba(241,210,191,0.26)] hover:text-white",
        ghost: "text-[rgba(255,248,242,0.76)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white",
        link: "text-[#f1d2bf] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-[1.125rem] py-2.5",
        sm: "h-9 px-3.5 py-2 text-xs",
        lg: "h-12 px-6 py-3 text-base",
        xl: "h-14 px-8 py-4 text-lg",
        icon: "h-11 w-11",
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
