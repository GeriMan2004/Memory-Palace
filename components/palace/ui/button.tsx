import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "ghost" | "danger";
type ButtonSize = "default" | "sm" | "lg" | "icon";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "default",
      type = "button",
      loading = false,
      loadingLabel,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        data-variant={variant}
        className={cn(
          "group relative inline-flex select-none items-center justify-center gap-2 rounded-none border font-medium tracking-tight outline-none",
          "transition-[background,color,border-color,box-shadow,transform] duration-150 ease-out",
          "focus-visible:ring-2 focus-visible:ring-fg/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          "active:translate-y-px",
          "disabled:pointer-events-none disabled:cursor-not-allowed",
          size === "default" && "h-12 px-5 text-sm",
          size === "sm" && "h-9 px-3 text-xs uppercase tracking-[0.18em]",
          size === "lg" && "h-14 px-7 text-sm",
          size === "icon" && "h-10 w-10 p-0 text-sm",
          variant === "primary" && [
            "border-fg bg-fg text-bg",
            "shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_0_0_rgba(0,0,0,0)]",
            "hover:bg-fg/95 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_8px_24px_-12px_rgba(255,255,255,0.35)]",
            "active:bg-fg/85 active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]",
            "disabled:border-border-strong disabled:bg-surface-2 disabled:text-subtle disabled:shadow-none",
          ],
          variant === "ghost" && [
            "border-transparent bg-transparent text-fg",
            "hover:bg-white/[0.04] hover:text-fg",
            "active:bg-white/[0.07]",
            "disabled:text-subtle",
          ],
          variant === "danger" && [
            "border-danger/50 bg-transparent text-danger",
            "hover:border-danger/80 hover:bg-danger/[0.08]",
            "active:bg-danger/[0.12]",
            "disabled:border-border disabled:text-subtle",
          ],
          className,
        )}
        {...props}
      >
        {loading ? (
          <>
            <Spinner />
            <span className="inline-flex">
              {loadingLabel ?? (typeof children === "string" ? children : "Working")}
            </span>
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);

function Spinner() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="motion-spinner h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="8" cy="8" r="6" opacity="0.25" />
      <path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round" />
    </svg>
  );
}
