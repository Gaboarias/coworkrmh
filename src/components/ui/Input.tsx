import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Input + Textarea (Edition 04).
 * - Border hairline (rule-strong cuando focus).
 * - bg-surface sólido, sin backdrop-blur.
 * - Focus ring usa project-color (heredado).
 * - Radius md (era lg).
 */
const fieldBase =
  "w-full rounded-md border border-rule-strong bg-surface px-3 py-2 text-[13px] text-ink placeholder:text-ink-faint transition-colors duration-150 ease-out focus:outline-none focus:border-ink focus:ring-2 focus:ring-[color-mix(in_oklab,var(--project-color)_30%,transparent)] disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-urgent aria-[invalid=true]:focus:ring-[color-mix(in_oklab,var(--urgent)_30%,transparent)]";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldBase, "h-9", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(fieldBase, "resize-none py-2.5 leading-relaxed", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { fieldBase };
