interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
      {actionLabel && onAction && (
        <button className="primary-button empty-state-action" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
