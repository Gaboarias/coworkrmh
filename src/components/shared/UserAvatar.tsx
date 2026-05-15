import { cn } from "@/lib/utils/cn";

interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-sm",
  md: "h-10 w-10 text-base",
  lg: "h-12 w-12 text-lg",
};

function getInitials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getColor(name?: string | null): string {
  const colors = [
    "bg-primary/30 text-primary",
    "bg-secondary/30 text-secondary",
    "bg-success/30 text-success",
    "bg-warning/30 text-warning",
    "bg-info/30 text-info",
  ];
  if (!name) return colors[0];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export function UserAvatar({
  name,
  avatarUrl,
  size = "sm",
  className,
}: UserAvatarProps) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name ?? "User"}
        className={cn(
          "rounded-full object-cover ring-2 ring-border",
          sizes[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-semibold",
        sizes[size],
        getColor(name),
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
