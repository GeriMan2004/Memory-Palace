import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

export function Progress({
  className,
  value,
}: {
  className?: string;
  value: number;
}) {
  return (
    <ProgressPrimitive.Root
      className={cn(
        "relative h-2.5 w-full overflow-hidden rounded-full bg-white/8",
        className,
      )}
      value={value}
    >
      <ProgressPrimitive.Indicator
        className="h-full rounded-full bg-[linear-gradient(90deg,#f7e0be,#d7a86e)] transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
