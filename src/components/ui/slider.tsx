"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
    variant?: "default" | "dark";
  }
>(({ className, variant = "default", ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center py-2",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track
      className={cn(
        "relative h-2.5 w-full grow overflow-hidden rounded-full border",
        variant === "dark"
          ? "border-slate-700 bg-slate-800"
          : "border-borderSubtle bg-elevated"
      )}
    >
      <SliderPrimitive.Range
        className={cn(
          "absolute h-full rounded-full transition-all",
          variant === "dark" ? "bg-[#A3E635]" : "bg-accentPrimary"
        )}
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        "block h-5 w-5 cursor-grab rounded-full border-2 shadow-md transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accentPrimary focus-visible:ring-offset-2 active:scale-110 active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50",
        variant === "dark"
          ? "border-[#A3E635] bg-slate-950"
          : "border-accentPrimary bg-surface"
      )}
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
