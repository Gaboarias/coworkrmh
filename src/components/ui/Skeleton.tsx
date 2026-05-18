import { cn } from "@/lib/utils/cn";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[color-mix(in_oklab,var(--text-tertiary)_22%,transparent)]",
        className
      )}
      {...props}
    />
  );
}
