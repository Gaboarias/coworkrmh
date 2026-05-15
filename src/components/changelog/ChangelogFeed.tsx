import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { History } from "lucide-react";

interface ChangelogEntry {
  id: string;
  action: string;
  entity_type: string;
  description: string;
  created_at: string;
  user?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface ChangelogFeedProps {
  entries: ChangelogEntry[];
}

const actionIcons: Record<string, string> = {
  created: "✨",
  updated: "✏️",
  deleted: "🗑️",
  status_changed: "🔄",
  assigned: "👤",
  unassigned: "➖",
  uploaded: "📎",
  noted: "📝",
};

export function ChangelogFeed({ entries }: ChangelogFeedProps) {
  if (!entries.length) {
    return (
      <EmptyState
        icon={<History className="h-12 w-12" />}
        title="Sin cambios registrados"
        description="Los cambios realizados en este proyecto aparecerán aquí"
      />
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry, idx) => {
        const isLast = idx === entries.length - 1;
        return (
          <div key={entry.id} className="flex gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-el text-sm">
                {actionIcons[entry.action] ?? "📋"}
              </div>
              {!isLast && (
                <div className="mt-1 w-px flex-1 bg-border" style={{ minHeight: "12px" }} />
              )}
            </div>

            {/* Content */}
            <div className={`pb-4 pt-1 ${isLast ? "" : ""}`}>
              <div className="flex items-center gap-2">
                {entry.user && (
                  <UserAvatar
                    name={entry.user.full_name}
                    avatarUrl={entry.user.avatar_url}
                    size="xs"
                  />
                )}
                <span className="text-sm font-medium text-text">
                  {entry.user?.full_name ?? "Sistema"}
                </span>
                <span className="text-xs text-text-tertiary">
                  {formatDistanceToNow(new Date(entry.created_at), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              </div>
              <p className="mt-1 text-sm text-text-muted">{entry.description}</p>
              <span className="mt-0.5 inline-flex rounded-full bg-surface-el px-2 py-0.5 text-xs text-text-tertiary">
                {entry.entity_type}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
