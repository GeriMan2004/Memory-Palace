import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-none border border-border bg-transparent px-4 text-base text-fg outline-none",
        "transition-[border-color,background-color] duration-150 ease-out",
        "placeholder:text-subtle",
        "hover:border-border-strong",
        "focus:border-fg",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
});
