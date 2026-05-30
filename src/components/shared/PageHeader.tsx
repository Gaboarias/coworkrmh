interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        {/* h1: Sora bold (font family vía globals.css h1 rule). */}
        <h1 className="text-3xl font-bold text-text">{title}</h1>
        {description && (
          <p className="mt-1.5 max-w-prose text-[15px] leading-relaxed text-text-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
