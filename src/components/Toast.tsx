export interface ToastMessage {
  type: 'success' | 'error';
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
}

export function Toast({ toast }: ToastProps) {
  if (!toast) return null;

  return <div className={`toast ${toast.type}`}>{toast.message}</div>;
}
