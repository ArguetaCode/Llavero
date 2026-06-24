# Llavero Seguro Backend

Backend base para futura sincronizacion cifrada de Llavero Seguro.

Este servicio no descifra bovedas, no recibe la contrasena maestra y no debe recibir datos de la boveda en texto plano. El campo `encryptedPayload` se trata como un blob opaco generado por el cliente.

## Stack

- Java 21
- Spring Boot
- Spring Security
- PostgreSQL
- Flyway
- Maven Wrapper

## Base de datos local

Levantar PostgreSQL de desarrollo:

```bash
docker compose up -d postgres
```

La base local usa credenciales solo de desarrollo:

- DB: `llavero_seguro`
- Usuario: `llavero_dev`
- Password: `llavero_dev_password`

Flyway corre automaticamente al iniciar el backend y aplica `src/main/resources/db/migration/V1__initial_schema.sql`.

## Configuracion

La configuracion comun vive en `src/main/resources/application.yml`.

- Perfil `dev`: `src/main/resources/application-dev.yml`, usa PostgreSQL y Flyway.
- Perfil `test`: `src/test/resources/application-test.yml`, usa H2 en memoria y no requiere Docker.

Variables de entorno principales:

```bash
DB_URL=jdbc:postgresql://localhost:5432/llavero_seguro
DB_USERNAME=llavero_dev
DB_PASSWORD=llavero_dev_password
JWT_SECRET=dev-only-change-this-secret-at-least-32-bytes
JWT_EXPIRATION_MINUTES=10080
CORS_ALLOWED_ORIGINS=http://localhost:5173
MAX_ENCRYPTED_PAYLOAD_BYTES=1048576
```

`JWT_SECRET` debe cambiarse fuera de desarrollo.

## Ejecutar

Con Java 21, usando Maven Wrapper:

```bash
./mvnw spring-boot:run
```

Con Docker Compose:

```bash
docker compose up --build backend
```

Sin Java local, usando una imagen de Maven:

```bash
docker run --rm -it \
  -v "$PWD":/workspace \
  -w /workspace \
  -e DB_URL=jdbc:postgresql://host.docker.internal:5432/llavero_seguro \
  -e DB_USERNAME=llavero_dev \
  -e DB_PASSWORD=llavero_dev_password \
  maven:3.9-eclipse-temurin-21 \
  mvn spring-boot:run
```

El backend expone `http://localhost:8080`.

## Tests

Con Maven Wrapper:

```bash
./mvnw test
```

Con Docker:

```bash
docker run --rm \
  -v "$PWD":/workspace \
  -w /workspace \
  maven:3.9-eclipse-temurin-21 \
  mvn test
```

Los tests usan H2 en memoria y no requieren PostgreSQL.

## Dockerfile

Construir la imagen:

```bash
docker build -t llavero-seguro-backend .
```

Ejecutarla contra PostgreSQL local expuesto por Docker Compose:

```bash
docker run --rm -p 8080:8080 \
  -e DB_URL=jdbc:postgresql://host.docker.internal:5432/llavero_seguro \
  -e DB_USERNAME=llavero_dev \
  -e DB_PASSWORD=llavero_dev_password \
  -e JWT_SECRET=dev-only-change-this-secret-at-least-32-bytes \
  llavero-seguro-backend
```

## Autenticacion

La fase 2.0 usa JWT stateless firmado con HMAC SHA-256. La contrasena de cuenta remota se guarda con BCrypt via Spring Security. El frontend todavia no almacena ni usa tokens; la integracion queda para fase 2.1.

No se debe enviar al backend:

- contrasena maestra local
- boveda descifrada
- contrasenas reales

## Endpoints

### Health

```http
GET /api/health
```

### Auth

```http
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
POST /api/auth/password
```

`POST /api/auth/password` requiere sesión, la contraseña actual y una nueva contraseña de 10 a 128 caracteres. Al cambiarla invalida los tokens anteriores y devuelve un token nuevo para la sesión actual.

`register` y `login` devuelven:

```json
{
  "token": "jwt",
  "user": {
    "id": "uuid",
    "email": "persona@example.com",
    "displayName": "Persona",
    "createdAt": "2026-06-18T00:00:00Z",
    "updatedAt": "2026-06-18T00:00:00Z",
    "lastLoginAt": null,
    "status": "ACTIVE"
  }
}
```

`password_hash` nunca se devuelve.

### Vault sync

Todos requieren:

```http
Authorization: Bearer <token>
```

```http
GET /api/vaults
POST /api/vaults
GET /api/vaults/{id}
PUT /api/vaults/{id}
DELETE /api/vaults/{id}
```

Payload de creacion/actualizacion:

```json
{
  "clientVaultId": "vault-id-local",
  "displayName": "Personal",
  "encryptedPayload": "blob-cifrado-del-cliente",
  "payloadVersion": 1
}
```

El servidor valida tamano y metadata, pero no interpreta ni descifra `encryptedPayload`.

## Ejemplos curl

Usa datos ficticios. No envies contrasenas reales de bovedas ni bovedas descifradas.

```bash
curl http://localhost:8080/api/health
```

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"persona@example.test","displayName":"Persona Demo","password":"remote-password-demo"}'
```

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"persona@example.test","password":"remote-password-demo"}'
```

```bash
curl http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

```bash
curl -X POST http://localhost:8080/api/vaults \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"clientVaultId":"local-vault-id-demo","displayName":"Personal","encryptedPayload":"payload-cifrado-ficticio","payloadVersion":1}'
```

```bash
curl http://localhost:8080/api/vaults \
  -H "Authorization: Bearer $TOKEN"
```

```bash
curl -X PUT http://localhost:8080/api/vaults/$VAULT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"clientVaultId":"local-vault-id-demo","displayName":"Personal actualizada","encryptedPayload":"payload-cifrado-ficticio-actualizado","payloadVersion":2}'
```

```bash
curl -X DELETE http://localhost:8080/api/vaults/$VAULT_ID \
  -H "Authorization: Bearer $TOKEN"
```

Tambien hay ejemplos en `http/requests.http`.

## Smoke test de sincronizacion

Con el backend levantado, ejecuta desde la raiz del repo:

```bash
backend/scripts/smoke-sync.sh
```

El script usa datos falsos unicos y valida:

- health
- registro
- login
- creacion de boveda remota
- listado de bovedas remotas

No imprime tokens completos. Si necesitas apuntar a otro host:

```bash
API_BASE_URL=https://backend-demo.example.com backend/scripts/smoke-sync.sh
```

## Esquema inicial

- `users`: perfiles remotos, email unico, hash BCrypt y estado.
- `remote_vaults`: blobs cifrados por usuario y `client_vault_id`.
- `audit_events`: eventos basicos de auth/sync con IP y user-agent truncados.

Indices y constraints principales:

- `users.email` es unico.
- `remote_vaults.user_id` tiene indice.
- `remote_vaults.client_vault_id` tiene indice.
- `(user_id, client_vault_id)` es unico para evitar duplicados por usuario.

## Errores esperados

- Email duplicado: `409`.
- Credenciales invalidas: `401`.
- Token invalido o ausente: `401`.
- Vault no encontrada o de otro usuario: `404`.
- Payload demasiado grande: `413`.
- Validacion fallida: `400`.

## Pendiente para fase 2.1

- Integrar UI con registro/login remoto.
- Subir blobs cifrados desde el frontend.
- Resolver conflictos de sincronizacion.
- Definir almacenamiento seguro de token en cliente.
- Endurecer despliegue productivo con secretos reales, HTTPS y CORS por ambiente.
