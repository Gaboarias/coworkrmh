import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

const fieldBase =
  "w-full rounded-lg border border-border bg-surface-el px-3 py-2 text-sm text-text placeholder:text-text-tertiary transition-colors duration-200 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--primary)_35%,transparent)] disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger";

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
    className={cn(fieldBase, "resize-none py-2.5", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { fieldBase };
