# QA Manual - Llavero Seguro

## Primer uso

- Abrir la app en HTTPS o `localhost`.
- Confirmar que se muestra la pantalla inicial con explicación de contraseña maestra.
- Crear una bóveda local con nombre de perfil.
- Intentar crear bóveda con menos de 10 caracteres y validar error.
- Intentar crear bóveda con confirmación distinta y validar error.
- Crear bóveda con contraseña maestra válida.
- Confirmar que la app entra a “Mi llavero”.

## Desbloqueo

- Recargar la página.
- Confirmar que aparece la selección de bóveda si existe al menos una.
- Seleccionar una bóveda local.
- Intentar desbloquear con contraseña incorrecta.
- Confirmar mensaje claro de contraseña incorrecta.
- Abrir “¿Olvidaste tu contraseña maestra?” y validar explicación.
- Desbloquear con contraseña correcta.

## CRUD de contraseñas

- Agregar contraseña con título, usuario y contraseña.
- Validar error si falta título, usuario o contraseña.
- Validar URL opcional inválida.
- Generar contraseña segura desde el formulario.
- Buscar el registro creado.
- Abrir detalle, mostrar/ocultar contraseña y copiar usuario/contraseña.
- Editar un registro y confirmar toast de actualización.
- Eliminar un registro y confirmar modal destructivo.

## Cambio de contraseña maestra

- Ir a Seguridad.
- Intentar cambiar con contraseña actual incorrecta.
- Intentar nueva contraseña menor a 10 caracteres.
- Intentar confirmación distinta.
- Cambiar con datos válidos.
- Bloquear bóveda.
- Confirmar que la contraseña anterior ya no desbloquea.
- Confirmar que la nueva contraseña desbloquea.

## Exportación e importación

- Exportar respaldo cifrado.
- Confirmar nombre `llavero-seguro-backup-YYYY-MM-DD.json`.
- Abrir el JSON y confirmar que no hay contraseñas en texto plano.
- Intentar importar JSON corrupto.
- Intentar importar respaldo con contraseña incorrecta.
- Importar respaldo correcto.
- Confirmar modal antes de reemplazar bóveda local.
- Importar respaldo como nueva bóveda local.
- Confirmar que la bóveda queda desbloqueada y en VaultPage.

## Multiusuario local

- Crear bóveda A.
- Agregar registro falso en bóveda A.
- Bloquear.
- Crear bóveda B.
- Agregar registro falso en bóveda B.
- Bloquear.
- Desbloquear bóveda A y confirmar que no aparecen datos de B.
- Bloquear.
- Desbloquear bóveda B y confirmar que no aparecen datos de A.
- Bloquear.
- Desbloquear bóveda A.
- Exportar bóveda A.
- Importar bóveda A como nueva bóveda local.
- Confirmar que se crea un perfil separado.
- Eliminar una bóveda y confirmar que las demás siguen existiendo.
- Revisar IndexedDB y confirmar perfiles separados en `vaultProfiles`.

## Cuenta remota y sincronización manual

- Levantar backend con `cd backend && docker compose up --build backend`.
- Resultado esperado: API disponible en `http://localhost:8080` y frontend sin romper modo local.
- Configurar `VITE_API_BASE_URL=http://localhost:8080`.
- Crear una bóveda local A y agregar un registro falso.
- Resultado esperado: el registro solo existe dentro de la bóveda A desbloqueada.
- Ir a Seguridad > Cuenta remota.
- Registrar usuario remoto con email, nombre y contraseña de cuenta remota.
- Confirmar que la UI aclara que no es la contraseña maestra.
- Resultado esperado: la app queda conectada y no pide contraseña maestra para la cuenta remota.
- Cerrar sesión remota.
- Resultado esperado: se limpian usuario remoto, token en memoria y listado remoto.
- Iniciar sesión remota con el usuario creado.
- Probar inicio de sesión con contraseña remota incorrecta.
- Resultado esperado: mostrar “Credenciales remotas incorrectas.” sin detalle técnico.
- Subir bóveda activa desde “Sincronización cifrada”.
- Resultado esperado: se crea o actualiza una bóveda remota; la metadata local muestra última subida y vínculo remoto.
- Ver bóvedas remotas y confirmar que aparece solo nombre, fecha y versión.
- Resultado esperado: si coincide con la bóveda local activa, aparece el indicador de coincidencia.
- Confirmar que no se muestra `encryptedPayload` completo.
- Descargar bóveda remota con contraseña maestra incorrecta y validar error.
- Resultado esperado: mostrar “No se pudo descifrar. Verifica la contraseña maestra de esa bóveda.”
- Descargar bóveda remota con contraseña maestra correcta.
- Resultado esperado: se abre modal de importación sin reemplazar todavía.
- Importar como nueva bóveda local y confirmar que se crea un perfil separado.
- Resultado esperado: la nueva bóveda conserva metadata remota no sensible y no mezcla datos con la bóveda A.
- Descargar otra vez y reemplazar bóveda activa solo después de confirmar.
- Resultado esperado: el modal muestra nombre local, nombre remoto, fecha local, fecha remota y exige escribir `REEMPLAZAR`.
- Resultado esperado: al cancelar no se modifica ninguna bóveda local.
- Resultado esperado: al confirmar se reemplaza únicamente la bóveda activa.
- Apagar backend e intentar listar/subir.
- Resultado esperado: mostrar “No se pudo conectar con el servidor. El modo local sigue disponible.”
- Apagar backend y confirmar que el modo local sigue funcionando.
- Probar sesión remota vencida o token inválido si es posible.
- Resultado esperado: mostrar “Sesión remota vencida o inválida. Inicia sesión otra vez.”
- Probar payload remoto inválido si es posible.
- Resultado esperado: mostrar error claro de payload/respaldo inválido sin stack trace ni JSON crudo.
- Revisar Network y confirmar que no se envía contraseña maestra ni bóveda descifrada.
- Revisar IndexedDB y confirmar que solo se guarda metadata no sensible de sync: `remoteVaultId`, `remoteDisplayName`, `lastRemoteSyncAt`, `lastRemoteUploadAt`, `lastRemoteDownloadAt`.

## Eliminación de bóveda

- Ir a Seguridad > Datos locales.
- Abrir modal de eliminación.
- Intentar confirmar sin escribir `ELIMINAR`.
- Confirmar escribiendo `ELIMINAR`.
- Validar regreso al selector de bóvedas si quedan otros perfiles locales.
- Validar regreso a SetupPage solo si no queda ninguna bóveda local.
- Revisar IndexedDB y confirmar que se eliminó solo el perfil seleccionado de `vaultProfiles`.

## Bloqueo automático

- Configurar bloqueo automático a 1 minuto.
- Dejar la app sin tocar.
- Confirmar que vuelve a UnlockPage.
- Confirmar que no quedan pantallas protegidas visibles.

## Instalación PWA

- Abrir app desde HTTPS.
- Si usas desarrollo local, crear túnel HTTPS o desplegar `dist/` en hosting estático.
- En Chrome Android, usar “Agregar a pantalla principal”.
- En Safari iOS, usar Compartir > Agregar a pantalla de inicio.
- Abrir en modo standalone.
- Confirmar navegación, desbloqueo y CRUD básico.

## Prueba con HTTPS

- Ejecutar `npm run build`.
- Ejecutar `npm run preview` para revisar producción local.
- Usar hosting HTTPS o túnel HTTPS para teléfono.
- Confirmar que Web Crypto permite crear y desbloquear bóveda.
- Confirmar que el manifest se detecta como instalable.

## Actualización de service worker

- Instalar la PWA o abrir el build en HTTPS.
- Publicar o servir una versión nueva.
- Confirmar que aparece “Hay una nueva versión disponible. Recarga para actualizar.”
- Confirmar que no se recarga automáticamente si la bóveda está desbloqueada.
- Recargar manualmente y confirmar que la app sigue funcionando.

## Revisión de almacenamiento

- Abrir DevTools > Application.
- Revisar IndexedDB: solo debe existir metadata y `encryptedVault`.
- Revisar Local Storage: no debe contener secretos.
- Revisar Session Storage: no debe contener secretos.
- Confirmar que el access token remoto no queda en Local Storage ni Session Storage.
- Confirmar que el access token remoto no queda en IndexedDB.
- Revisar Cache Storage: solo debe contener shell/assets públicos, no respaldos ni datos de bóveda.
- Revisar consola: no debe imprimir contraseña maestra ni contraseñas.

## Checklist móvil

- Probar ancho 360px.
- Probar ancho 390px.
- Probar ancho 430px.
- Validar que bottom navigation no tape botones.
- Validar que FAB no tape el último registro.
- Probar Chrome Android.
- Probar Safari iOS.
- Probar modo standalone PWA.
