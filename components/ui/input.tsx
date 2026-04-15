import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      className={cn(
        "flex h-12 w-full rounded-2xl border border-white/12 bg-black/20 px-4 text-base text-stone-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition placeholder:text-stone-500 focus:border-[#dfb57b] focus:bg-black/28",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
