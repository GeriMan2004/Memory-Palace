import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  size?: "default" | "sm" | "icon";
  variant?: "primary" | "ghost" | "outline";
};

export function Button({
  asChild = false,
  className,
  size = "default",
  variant = "primary",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center rounded-full border text-sm font-medium transition duration-200 ease-out disabled:pointer-events-none disabled:opacity-45",
        variant === "primary" &&
          "border-white/10 bg-[linear-gradient(135deg,rgba(245,225,192,0.95),rgba(204,162,105,0.92))] text-stone-950 shadow-[0_14px_40px_rgba(234,194,138,0.28)] hover:brightness-105",
        variant === "outline" &&
          "border-white/14 bg-white/6 text-stone-100 hover:bg-white/10",
        variant === "ghost" &&
          "border-transparent bg-transparent text-stone-200 hover:bg-white/7",
        size === "default" && "h-12 px-5",
        size === "sm" && "h-9 px-3.5 text-xs uppercase tracking-[0.22em]",
        size === "icon" && "h-11 w-11",
        className,
      )}
      {...props}
    />
  );
}
