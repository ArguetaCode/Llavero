# Llavero Seguro

MVP de una app web/PWA móvil primero para gestionar una bóveda local de contraseñas. La bóveda completa se cifra del lado del cliente con Web Crypto API y se guarda en IndexedDB.

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Para probar desde un teléfono en la misma red, recuerda que el cifrado usa Web Crypto API. En móvil, abrir `http://IP-local:5173` normalmente no es un contexto seguro, por lo que la bóveda no se podrá crear ni desbloquear. Usa una URL HTTPS, un túnel HTTPS de desarrollo o despliega el build en un hosting HTTPS.

## Uso básico

1. Crea una bóveda con una contraseña maestra de al menos 10 caracteres.
2. Agrega registros con título, usuario y contraseña.
3. Usa Seguridad para revisar auditoría local, exportar respaldos cifrados y cambiar la contraseña maestra.
4. Bloquea la bóveda al terminar.

## Multiusuario local

Llavero Seguro permite crear varias bóvedas locales en el mismo navegador. Esto no es multiusuario con servidor todavía: no hay login remoto, backend ni sincronización. Por ahora todo vive en IndexedDB dentro del navegador local.

- Cada bóveda local tiene su propio nombre, salt, IV, metadata criptográfica y contraseña maestra.
- Cada bóveda local se desbloquea por separado y sus registros no se mezclan con los de otra bóveda.
- Exportar respaldo exporta únicamente la bóveda activa.
- Importar respaldo puede crear una bóveda local nueva con un perfil separado o reemplazar la bóveda activa después de confirmar.
- Eliminar una bóveda local elimina únicamente ese perfil local de este navegador; las demás bóvedas locales no se afectan.
- En una fase futura, el backend permitiría cuentas reales, multiusuario con servidor y sincronización entre dispositivos.

## Compilación

```bash
npm run build
```

## Vista previa de producción

```bash
npm run preview
```

Para exponer la vista previa en red local:

```bash
npm run preview:host
```

## Pruebas

```bash
npm test
```

## Instalación como PWA

La app debe abrirse desde HTTPS para poder instalarse y usar Web Crypto correctamente.

- Chrome Android: abrir la URL HTTPS > menú > Agregar a pantalla principal.
- Safari iOS: abrir la URL HTTPS > Compartir > Agregar a pantalla de inicio.
- Desktop Chrome/Edge: usar el icono de instalación en la barra de dirección cuando esté disponible.

Para desarrollo móvil puedes usar un túnel HTTPS como Cloudflare Tunnel apuntando a `http://localhost:5173`.

## Probar en teléfono

Para probar creación/desbloqueo de bóveda en teléfono usa HTTPS. `localhost` funciona en la computadora, pero `http://IP-local` en móvil no es contexto seguro para Web Crypto.

Opciones:

- túnel HTTPS de desarrollo hacia Vite
- túnel HTTPS hacia `npm run preview`
- despliegue temporal de `dist/` en hosting estático HTTPS

## Despliegue HTTPS de prueba

La app es estática. No necesita backend ni variables sensibles.

Vercel, Netlify o Cloudflare Pages:

1. Ejecutar `npm run build`.
2. Publicar la carpeta `dist/`.
3. Servir siempre por HTTPS.
4. Probar instalación PWA desde la URL publicada.

No subas respaldos cifrados de usuario ni bases IndexedDB. La app no requiere secretos de entorno.

## Release local

Antes de compartir una build de prueba, sigue [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md):

- instalar dependencias
- correr tests
- compilar
- probar preview
- probar teléfono/PWA
- revisar almacenamiento y consola

## Funcionalidades

- Configuración inicial de contraseña maestra.
- Derivación de clave con PBKDF2 SHA-256 y salt aleatorio.
- Cifrado de la bóveda con AES-GCM e IV nuevo por guardado.
- Persistencia local en IndexedDB sin usar localStorage para datos sensibles.
- Desbloqueo de bóveda por contraseña maestra.
- Alta, búsqueda, detalle, edición y eliminación de contraseñas.
- Generador de contraseñas seguras.
- Indicador básico de fortaleza.
- Copiado de usuario y contraseña desde el detalle.
- Panel de seguridad con conteos de contraseñas débiles y repetidas.
- Exportación e importación de respaldo cifrado.
- Eliminación de la bóveda local activa sin borrar otros perfiles locales.
- Cambio de contraseña maestra con re-cifrado completo de la bóveda.
- Auditoría local de contraseñas débiles, repetidas, favoritas y registros incompletos.
- Manifest y service worker básico para instalación como PWA.

## Limitaciones

- No hay backend ni sincronización entre dispositivos.
- La recuperación de bóveda no existe si se pierde la contraseña maestra.
- El almacenamiento depende del navegador y del dispositivo.
- No es todavía un gestor de contraseñas auditado para producción.

## Seguridad actual

- La contraseña maestra no se guarda.
- La bóveda completa se cifra como JSON con AES-GCM.
- La clave se deriva con PBKDF2 SHA-256 usando salt aleatorio.
- Cada guardado usa un IV aleatorio nuevo.
- IndexedDB guarda solo `salt`, `iv`, bóveda cifrada, fecha de creación y versión de esquema.
- No se usan `localStorage` ni `sessionStorage` para datos sensibles.
- La bóveda descifrada vive en memoria solo mientras está desbloqueada.
- El bloqueo manual y automático limpia el estado sensible de la app lo mejor posible desde JavaScript.
- Los respaldos exportados contienen solo metadata no sensible y la bóveda cifrada.
- La metadata criptográfica incluye versión, KDF, hash, iteraciones y cifrado para facilitar compatibilidad futura.

## Cambio de contraseña maestra

Desde Seguridad puedes cambiar la contraseña maestra ingresando la contraseña actual, la nueva contraseña y su confirmación. Si la contraseña actual descifra correctamente la bóveda, la app genera un salt nuevo, deriva una clave nueva y re-cifra toda la bóveda con un IV nuevo antes de persistirla en IndexedDB.

La contraseña maestra anterior y la nueva no se guardan. Si pierdes la contraseña maestra vigente, no existe recuperación local ni desde respaldos.

## Auditoría local de bóveda

La pantalla Seguridad calcula métricas locales sobre la bóveda desbloqueada:

- total de registros
- contraseñas débiles, medias y fuertes
- contraseñas repetidas
- registros sin sitio web
- favoritos
- última actualización

La lista y el detalle muestran alertas cuando una contraseña está repetida, sin mostrar el valor repetido.

## Respaldo cifrado

Desde la pestaña Seguridad puedes usar **Exportar respaldo cifrado** para descargar un archivo con nombre similar a:

```text
llavero-seguro-backup-YYYY-MM-DD.json
```

Ese archivo incluye metadata como `vaultId`, `displayName`, `appName`, `schemaVersion`, `exportedAt`, `salt`, `iv` y `encryptedVault`. No incluye contraseñas en texto plano.

Para importar un respaldo:

1. Abrir Seguridad > Respaldo.
2. Seleccionar el archivo `.json`.
3. Ingresar la contraseña maestra con la que se creó ese respaldo.
4. Confirmar si se importará como nueva bóveda local o si reemplazará la bóveda local activa.

Importar un respaldo como nueva bóveda crea un perfil local separado. Reemplazar un respaldo solo afecta la bóveda local activa. Si no tienes la contraseña maestra correcta, el respaldo no se puede descifrar ni recuperar.

## Validación manual

1. Abrir `http://localhost:5173/`.
2. Crear una bóveda con contraseña maestra de al menos 10 caracteres.
3. Agregar 2 o 3 contraseñas falsas.
4. Recargar la página.
5. Desbloquear con contraseña correcta.
6. Probar contraseña incorrecta.
7. Editar una contraseña.
8. Eliminar una contraseña.
9. Cambiar la contraseña maestra y confirmar que la bóveda queda desbloqueada.
10. Bloquear la bóveda y desbloquear con la contraseña nueva.
11. Exportar respaldo cifrado y confirmar que no contiene datos en texto plano.
12. Importar respaldo cifrado con contraseña incorrecta y confirmar que falla.
13. Importar respaldo cifrado con contraseña correcta y confirmar antes de reemplazar.
14. Revisar en DevTools > Application:
    - IndexedDB debe mostrar solo metadata y el bloque cifrado.
    - Local Storage no debe contener secretos.
    - Session Storage no debe contener secretos.

## Checklist de validación

El checklist completo de QA manual está en [QA.md](QA.md). Incluye primer uso, desbloqueo, CRUD, cambio de contraseña maestra, respaldo/importación, eliminación de bóveda, bloqueo automático, PWA, service worker, HTTPS y pruebas móviles.

## Limitaciones conocidas

- No hay recuperación de contraseña maestra.
- No hay auditoría externa de seguridad.
- No hay sincronización, backup remoto ni multi-dispositivo.
- La app todavía no está auditada para producción.
- El portapapeles depende de permisos y comportamiento del navegador.
- Una PWA no puede garantizar siempre la limpieza automática del portapapeles.
- El borrado de memoria en JavaScript es limitado por el runtime del navegador.
