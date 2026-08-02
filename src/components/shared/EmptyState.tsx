interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="mb-4 text-ink-faint">{icon}</div>
      )}
      <h3 className="mb-1 text-base font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mb-4 max-w-xs text-sm text-ink-soft">{description}</p>
      )}
      {action}
    </div>
  );
}
