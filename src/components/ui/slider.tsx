"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2.5 w-full grow overflow-hidden rounded-full border border-[rgba(255,239,229,0.1)] bg-[rgba(255,255,255,0.06)]">
      <SliderPrimitive.Range className="absolute h-full bg-[linear-gradient(90deg,rgba(230,116,59,1),rgba(247,188,90,0.96))]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-[1.125rem] w-[1.125rem] rounded-full border border-[rgba(255,243,236,0.3)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,210,191,0.96))] shadow-[0_8px_18px_rgba(0,0,0,0.28)] ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(204,90,40,0.34)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(8,10,14,0.96)] disabled:pointer-events-none disabled:opacity-50 hover:scale-110" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
