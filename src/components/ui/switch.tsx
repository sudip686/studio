"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-[1.625rem] w-[2.875rem] shrink-0 cursor-pointer items-center rounded-full border border-[rgba(255,239,229,0.14)] bg-[rgba(255,255,255,0.08)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all",
      "data-[state=checked]:border-[rgba(241,210,191,0.22)] data-[state=checked]:bg-[linear-gradient(180deg,rgba(230,116,59,0.96),rgba(179,76,33,0.98))]",
      "hover:bg-[rgba(255,255,255,0.12)] data-[state=checked]:hover:brightness-[1.03]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(204,90,40,0.34)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(8,10,14,0.96)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full border border-[rgba(255,255,255,0.26)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,242,239,0.96))] shadow-[0_8px_18px_rgba(0,0,0,0.28)] ring-0 transition-transform",
        "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        "data-[state=checked]:shadow-[0_10px_18px_rgba(0,0,0,0.22)]",
        className
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
