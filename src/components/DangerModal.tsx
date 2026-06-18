interface DangerModalProps {
  title: string;
  description: string;
  confirmLabel: string;
  isWorking?: boolean;
  children?: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DangerModal({ title, description, confirmLabel, isWorking = false, children, onCancel, onConfirm }: DangerModalProps) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="dangerModalTitle">
      <div className="modal-panel">
        <h2 id="dangerModalTitle">{title}</h2>
        <p>{description}</p>
        {children}
        <div className="modal-actions">
          <button className="ghost-button" type="button" disabled={isWorking} onClick={onCancel}>
            Cancelar
          </button>
          <button className="danger-button" type="button" disabled={isWorking} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
