export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  if (import.meta.env.DEV) {
    window.addEventListener('load', () => {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => void registration.unregister());
      });
      if ('caches' in window) {
        void caches.keys().then((keys) => {
          keys.filter((key) => key.startsWith('llavero-seguro-')).forEach((key) => void caches.delete(key));
        });
      }
    });
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('llavero:update-available'));
          }
        });
      });
    }).catch(() => {
      // La app sigue funcionando sin service worker.
    });
  });
}
