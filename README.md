# Llavero Seguro

MVP de una app web/PWA móvil primero para gestionar una bóveda local de contraseñas. La bóveda completa se cifra del lado del cliente con Web Crypto API y se guarda en IndexedDB.

## Requisitos

- Node.js 20.19 o superior (o 22.12 o superior) y npm.
- Docker con Docker Compose, únicamente si se usarán cuentas remotas y sincronización.

## Ejecutar solo el frontend

Este modo permite usar bóvedas locales en IndexedDB y no requiere Java, PostgreSQL ni Docker.

Desde la raíz del repositorio:

```bash
npm ci
npm run dev
```

Abre `http://localhost:5173` en el navegador. Para detener el servidor, presiona `Ctrl+C`.

Para probar o generar una versión local pura sin backend ni opciones de cuenta remota:

```bash
npm run dev:local
npm run build:local
```

`build:local` genera `dist/` sin URL de API remota. En ese modo la app entra directo al flujo de bóvedas locales y las opciones de cuenta/sincronización remota no se muestran.

## Ejecutar la aplicación completa

Este modo levanta el frontend, el backend y PostgreSQL para habilitar cuentas remotas y sincronización cifrada.

1. Crea la configuración local del frontend desde la raíz del repositorio:

```bash
cp .env.example .env
```

El valor predeterminado conecta el frontend con `http://localhost:8080`.

2. En una terminal, levanta PostgreSQL y el backend:

```bash
cd backend
docker compose up --build backend
```

Espera hasta que el backend termine de iniciar. Estará disponible en `http://localhost:8080`; puedes comprobarlo abriendo `http://localhost:8080/api/health`.

3. En otra terminal, desde la raíz del repositorio, levanta el frontend:

```bash
npm ci
npm run dev
```

4. Abre `http://localhost:5173`.

Para detener los procesos, presiona `Ctrl+C` en ambas terminales. Después elimina los contenedores, conservando los datos de PostgreSQL:

```bash
cd backend
docker compose down
```

Para borrar también la base de datos local, usa `docker compose down -v`. Este último comando es destructivo y elimina las cuentas y bóvedas remotas almacenadas localmente.

Para probar desde un teléfono en la misma red, recuerda que el cifrado usa Web Crypto API. En móvil, abrir `http://IP-local:5173` normalmente no es un contexto seguro, por lo que la bóveda no se podrá crear ni desbloquear. Usa una URL HTTPS, un túnel HTTPS de desarrollo o despliega el build en un hosting HTTPS.

## Uso básico

1. Crea una bóveda con una contraseña maestra de al menos 10 caracteres.
2. Agrega registros con título, usuario y contraseña.
3. Usa Seguridad para revisar auditoría local, exportar respaldos cifrados y cambiar la contraseña maestra.
4. Bloquea la bóveda al terminar.

## Multiusuario local

Llavero Seguro permite crear varias bóvedas locales en el mismo navegador. El modo local sigue funcionando sin backend y por ahora todo vive en IndexedDB dentro del navegador local salvo cuando el usuario decide usar sincronización manual cifrada.

- Cada bóveda local tiene su propio nombre, salt, IV, metadata criptográfica y contraseña maestra.
- Cada bóveda local se desbloquea por separado y sus registros no se mezclan con los de otra bóveda.
- Exportar respaldo exporta únicamente la bóveda activa.
- Importar respaldo puede crear una bóveda local nueva con un perfil separado o reemplazar la bóveda activa después de confirmar.
- Eliminar una bóveda local elimina únicamente ese perfil local de este navegador; las demás bóvedas locales no se afectan.
- En una fase futura, el backend permitiría cuentas reales, multiusuario con servidor y sincronización entre dispositivos.

## Backend y sincronización cifrada

La carpeta `backend/` contiene el servicio Spring Boot para cuentas remotas y sincronización manual cifrada. El frontend actual sigue funcionando en modo local con IndexedDB aunque el backend esté apagado.

- El backend guarda usuarios remotos, auditoría básica y bóvedas remotas como blobs cifrados.
- El backend no recibe la contraseña maestra, no recibe bóvedas descifradas y no descifra `encryptedPayload`.
- La autenticación remota usa contraseña de cuenta remota con hash BCrypt y JWT stateless para esta fase.
- La fase 2.0.1 agrega Maven Wrapper, Dockerfile, Compose con API opcional, tests backend ampliados, ejemplos HTTP y CI básico.
- PostgreSQL se levanta con Docker Compose en `backend/docker-compose.yml`.
- La fase 2.1 conecta la UI a login remoto y sincronización manual desde Seguridad.
- La fase 2.1.1 estabiliza mensajes de error, metadata local de sync y confirmación explícita antes de reemplazar.
- El access token se guarda en `localStorage` para conservar la sesión remota en este dispositivo. Se elimina al cerrar sesión, vence en el servidor y no se guarda en IndexedDB.
- La resolución automática de conflictos y el refresh token seguro quedan para una fase posterior.

Ver instrucciones completas en [backend/README.md](backend/README.md).

### Configurar frontend para backend

Crea un `.env` local basado en `.env.example`:

```bash
VITE_API_BASE_URL=http://localhost:8080
```

Levanta backend y frontend:

```bash
cd backend
docker compose up --build backend
```

```bash
npm run dev
```

Desde la app:

1. En un navegador sin bóvedas locales, crear una cuenta remota o iniciar sesión desde el onboarding.
2. Si la cuenta ya tiene bóvedas, seleccionar una e importarla con su contraseña maestra.
3. Si la cuenta es nueva, crear la primera bóveda y confirmar el respaldo cifrado que se ofrece inmediatamente.
4. También puedes administrar la cuenta y la sincronización manual desde Seguridad.
5. Usar Seguridad > Sincronización cifrada > Subir bóveda activa para respaldos posteriores.
6. Usar Ver bóvedas remotas para listar blobs cifrados.
7. Para reemplazar una bóveda existente desde Seguridad, revisar nombre/fecha local, nombre/fecha remota y escribir `REEMPLAZAR`.

La contraseña maestra y la bóveda descifrada nunca se envían al backend. El servidor guarda solo el blob cifrado (`encryptedPayload`) y metadata no sensible como nombre, versión de payload y fechas.

La app guarda metadata local no sensible por bóveda para evitar duplicados remotos y mostrar estado de sincronización:

- `remoteVaultId`
- `remoteDisplayName`
- `lastRemoteSyncAt`
- `lastRemoteUploadAt`
- `lastRemoteDownloadAt`

Cada cuenta remota mantiene una sola bóveda activa. Al iniciar sesión, la app compara las fechas de la copia local y remota: sube la local si es más reciente o aplica la remota automáticamente cuando puede descifrarla con la clave que ya está en memoria. Después de vincularla, las altas, ediciones y eliminaciones se respaldan automáticamente mientras la sesión remota siga activa. No hay resolución automática de conflictos simultáneos en esta fase.

### Validación de sincronización manual

Levanta backend y frontend:

```bash
cd backend
docker compose up --build backend
```

```bash
npm run dev
```

Flujo manual recomendado:

1. Crear una bóveda local A y agregar registros falsos.
2. Registrar una cuenta remota desde Seguridad > Cuenta remota.
3. Iniciar sesión remota.
4. Subir la bóveda activa desde Seguridad > Sincronización cifrada.
5. Listar bóvedas remotas.
6. Descargar con contraseña maestra incorrecta y confirmar error amigable.
7. Descargar con contraseña maestra correcta.
8. Importar como nueva bóveda local y confirmar que se crea un perfil separado.
9. Repetir descarga y reemplazar la bóveda activa escribiendo `REEMPLAZAR`.
10. Cancelar un reemplazo y confirmar que no cambia nada.
11. Apagar backend y confirmar que el modo local sigue funcionando.

Smoke test del backend:

```bash
backend/scripts/smoke-sync.sh
```

El script usa datos falsos, prueba health, registro, login, creación y listado de bóvedas remotas. No imprime tokens completos.

Revisión DevTools:

- IndexedDB no debe contener access token, contraseña maestra ni bóveda descifrada.
- Local Storage solo debe contener el access token remoto activo. Session Storage no debe contener secretos.
- Cache Storage solo debe contener shell/assets públicos.
- Network no debe mostrar contraseña maestra ni registros descifrados; `/api/vaults` debe enviar solo el blob cifrado y metadata no sensible.
- Console no debe imprimir tokens, contraseñas ni payloads completos.

### Probar sincronización desde teléfono

En red local:

```bash
npm run dev -- --host 0.0.0.0
```

Configura `VITE_API_BASE_URL` con una URL del backend accesible desde el teléfono. Si usas IP local con HTTP, recuerda que Web Crypto puede bloquear creación/desbloqueo por no ser contexto seguro.

### Ejecutar la aplicación completa con túneles HTTPS

Este procedimiento usa dos túneles rápidos de Cloudflare: uno para el frontend y otro para el backend. Las URL `trycloudflare.com` son temporales y cambian cada vez que se vuelve a ejecutar `cloudflared`.

1. Instala `cloudflared` si todavía no está disponible. En macOS con Homebrew:

```bash
brew install cloudflared
```

2. Desde la raíz del repositorio, instala las dependencias y crea la configuración del frontend:

```bash
npm ci
cp .env.example .env
```

3. En la terminal 1, levanta el frontend:

```bash
npm run dev
```

4. En la terminal 2, crea el túnel del frontend. `--http-host-header` permite que Vite acepte las solicitudes enviadas por el túnel:

```bash
cloudflared tunnel --url http://localhost:5173 --http-host-header localhost:5173
```

Copia la URL HTTPS que muestra `cloudflared`, por ejemplo `https://frontend-ejemplo.trycloudflare.com`. Esta será la `URL_FRONTEND` en los pasos siguientes.

5. En la terminal 3, levanta PostgreSQL y el backend permitiendo el origen local y la URL pública exacta del frontend. Sustituye el valor de ejemplo por la URL obtenida en el paso anterior, sin `/` al final:

```bash
cd backend
CORS_ALLOWED_ORIGINS="http://localhost:5173,https://frontend-ejemplo.trycloudflare.com" docker compose up --build backend
```

Espera a que `http://localhost:8080/api/health` responda correctamente.

6. En la terminal 4, crea el túnel del backend:

```bash
cloudflared tunnel --url http://localhost:8080
```

Copia la nueva URL HTTPS, por ejemplo `https://backend-ejemplo.trycloudflare.com`. Esta será la `URL_BACKEND`; no debe ser la misma URL del frontend.

7. En el archivo `.env` de la raíz, reemplaza su contenido con la URL real del backend, sin `/` al final:

```dotenv
VITE_API_BASE_URL=https://backend-ejemplo.trycloudflare.com
```

8. Detén únicamente el frontend de la terminal 1 con `Ctrl+C` y vuelve a iniciarlo para que Vite lea el nuevo `.env`:

```bash
npm run dev
```

El túnel de la terminal 2 seguirá apuntando al puerto `5173`. Abre la `URL_FRONTEND` desde la computadora o el teléfono. No cierres ninguna de las cuatro terminales mientras uses la aplicación.

Para detener todo, presiona `Ctrl+C` en las cuatro terminales y luego elimina los contenedores sin borrar los datos:

```bash
cd backend
docker compose down
```

Si reinicias cualquiera de los túneles rápidos, repite la configuración con las nuevas URL. No abras CORS a cualquier origen en producción.

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
- Persistencia de la bóveda cifrada en IndexedDB; `localStorage` solo conserva el access token remoto.
- Desbloqueo de bóveda por contraseña maestra.
- Alta, búsqueda, detalle, edición y eliminación de contraseñas.
- Generador de contraseñas seguras.
- Indicador básico de fortaleza.
- Copiado de usuario y contraseña desde el detalle.
- Panel de seguridad con conteos de contraseñas débiles y repetidas.
- Exportación e importación de respaldo cifrado.
- Cuenta remota opcional con sesión persistente en el dispositivo.
- Sincronización manual de bóveda activa como blob cifrado, con metadata local no sensible.
- Eliminación de la bóveda local activa sin borrar otros perfiles locales.
- Cambio de contraseña maestra con re-cifrado completo de la bóveda.
- Auditoría local de contraseñas débiles, repetidas y registros incompletos.
- Manifest y service worker básico para instalación como PWA.

## Limitaciones

- La sincronización automática solo opera sobre bóvedas vinculadas mientras la sesión remota está activa; no hay resolución automática de conflictos.
- La recuperación de bóveda no existe si se pierde la contraseña maestra.
- El almacenamiento depende del navegador y del dispositivo.
- No es todavía un gestor de contraseñas auditado para producción.

## Seguridad actual

- La contraseña maestra no se guarda.
- La bóveda completa se cifra como JSON con AES-GCM.
- La clave se deriva con PBKDF2 SHA-256 usando salt aleatorio.
- Cada guardado usa un IV aleatorio nuevo.
- IndexedDB guarda solo `salt`, `iv`, bóveda cifrada, fecha de creación y versión de esquema.
- `localStorage` solo conserva el access token remoto; nunca guarda la contraseña maestra ni la bóveda descifrada.
- El token remoto persiste entre aperturas, se elimina al cerrar sesión y vence en el servidor.
- El token remoto no se guarda en IndexedDB.
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
    - Local Storage solo puede contener el access token remoto activo.
    - Local Storage solo puede contener el access token remoto activo.

## Checklist de validación

El checklist completo de QA manual está en [QA.md](QA.md). Incluye primer uso, desbloqueo, CRUD, cambio de contraseña maestra, respaldo/importación, eliminación de bóveda, bloqueo automático, PWA, service worker, HTTPS y pruebas móviles.

## Limitaciones conocidas

- No hay recuperación de contraseña maestra.
- No hay auditoría externa de seguridad.
- La sincronización remota es manual y experimental.
- La app todavía no está auditada para producción.
- El portapapeles depende de permisos y comportamiento del navegador.
- Una PWA no puede garantizar siempre la limpieza automática del portapapeles.
- El borrado de memoria en JavaScript es limitado por el runtime del navegador.
