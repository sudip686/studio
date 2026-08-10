import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-[rgba(255,239,229,0.12)] bg-[linear-gradient(180deg,rgba(20,16,13,0.9),rgba(11,9,8,0.96))] px-3.5 py-2.5 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] placeholder:text-white/42",
          "transition-[border-color,box-shadow,background-color] duration-200",
          "focus:outline-none focus:border-[rgba(204,90,40,0.56)] focus:ring-2 focus:ring-[rgba(204,90,40,0.18)] focus:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
