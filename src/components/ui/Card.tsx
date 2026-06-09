import { cn } from "@/lib/utils/cn";

/**
 * Card (Edition 04).
 *
 * Cambios vs Sunset Aurora:
 * - Sin backdrop-blur, sin shadow-elev-2.
 * - Border hairline (rule, no rule-strong).
 * - Radius reducido a md (era xl que se siente "blob").
 * - bg-surface (solid).
 */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md border border-rule bg-surface",
        className
      )}
      {...props}
    />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}
