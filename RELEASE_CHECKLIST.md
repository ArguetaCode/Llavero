# Release local - Llavero Seguro

## Preparación

- Ejecutar `npm install`.
- Ejecutar `npm test`.
- Ejecutar `npm run build`.
- Ejecutar `npm run preview`.
- Ejecutar `npm run preview:host` si se probará en red local.

## Navegador escritorio

- Abrir la app desde `http://localhost:4173`.
- Crear o desbloquear bóveda.
- Agregar, editar y eliminar una contraseña falsa.
- Cambiar contraseña maestra.
- Exportar respaldo cifrado.
- Importar respaldo cifrado.

## Teléfono y PWA

- Probar desde una URL HTTPS.
- Instalar como PWA.
- Abrir en modo standalone.
- Confirmar desbloqueo y CRUD básico.
- Confirmar que el bottom navigation y FAB no tapan contenido.

## Almacenamiento y secretos

- Revisar DevTools > Application > IndexedDB.
- Confirmar que solo hay metadata y `encryptedVault`.
- Revisar Local Storage.
- Revisar Session Storage.
- Revisar Cache Storage.
- Confirmar que no hay contraseñas ni contraseña maestra visibles.
- Revisar consola del navegador.
- Confirmar que no hay logs con secretos.

## Service worker

- Confirmar que `sw.js` cachea solo shell/assets públicos.
- Confirmar que una nueva versión muestra aviso de actualización.
- Confirmar que la app no recarga automáticamente con bóveda desbloqueada.

## Cierre

- Confirmar que `npm audit --omit=dev` no reporte vulnerabilidades.
- Confirmar que README y QA.md estén actualizados.
