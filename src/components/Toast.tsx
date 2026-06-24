export interface ToastMessage {
  type: 'success' | 'error';
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
}

export function Toast({ toast }: ToastProps) {
  if (!toast) return null;

  return (
    <div className="notification-modal-backdrop" role="status" aria-live="polite">
      <div className={`notification-modal ${toast.type}`}>
        <span aria-hidden="true">{toast.type === 'success' ? '✓' : '!'}</span>
        <p>{toast.message}</p>
      </div>
    </div>
  );
}
