# Autorización: retiro de backend y sincronización remota de Sodi Key

- **Referencia:** [Issue #9 — Migración de Sodi Key a Git y automatización del despliegue en producción](https://github.com/ArguetaCode/Sodi-Consultores-Negocios-y-Tecnolog-a/issues/9)
- **Autoriza:** @ArguetaCode (solicitante de la tarea)
- **Ejecuta:** @PGC36
- **Fecha de autorización:** 2026-07-23
- **Commit desplegado bajo esta autorización:** `39af81b`

## Decisión

Sodi Key (Llavero) pasa a operar en modo **local-first**, sin backend propio y sin base de
datos en el servidor. Cada bóveda se cifra y persiste íntegramente en el `IndexedDB` del
navegador (nombre, salt, IV, metadata criptográfica y contraseña maestra independientes por
bóveda). No se implementan cuentas de servidor, sincronización automática entre dispositivos
ni multiusuario basado en backend.

Esta decisión implica el retiro de los contenedores `sodi_key_backend` y `sodi_key_postgres`.

## Cita textual de la autorización (comentario del issue #9, @ArguetaCode)

> La versión actual de Llavero Seguro funciona en modo local-first y permite múltiples bóvedas
> locales en un mismo navegador.
>
> La aplicación debe funcionar sin backend y sin base de datos del servidor.
> [...]
> No implementar todavía cuentas de servidor, sincronización automática entre dispositivos ni
> multiusuario basado en backend.
> Confirmar mediante revisión del código que frontend y backend no tengan una dependencia
> operativa de PostgreSQL antes de retirar el contenedor sodi_key_postgres.
> Si la aplicación es completamente estática, evaluar si el contenedor backend también es
> innecesario; no retirarlo sin verificar primero sus funciones reales.

## Impacto conocido y aceptado

Antes de ejecutar el retiro, la auditoría detectó **5 usuarios** con cuentas remotas y bóvedas
sincronizadas contra el backend/PostgreSQL entonces vigente. El solicitante (@ArguetaCode)
aceptó explícitamente este impacto como parte de la decisión de migrar a modo local-only:

- Esos 5 usuarios pierden la sincronización remota entre dispositivos.
- Sus bóvedas ya almacenadas localmente en el navegador de cada dispositivo **no se ven
  afectadas** ni se pierden por este cambio.
- No existe, tras el retiro del backend, un mecanismo para recuperar el acceso remoto sin
  reintroducir backend + base de datos.

## Reversibilidad

- Volumen `sodi_key_postgres_data`: conservado, sin borrar.
- Dump de la base de datos: `/opt/sodi-platform/backups/sodi-key/sodi_key_postgres_20260723-095050.sql`.
- Copia completa de la instalación previa (backend + Postgres):
  `/opt/sodi-platform/apps/sodi-key.superseded-20260723-095442/`.
- El procedimiento de rollback completo (reintroducir backend + Postgres) está documentado en
  el reporte de cierre del issue #9.

## Alcance de este documento

Este documento certifica la autorización recibida para retirar backend y sincronización
remota. No autoriza cambios adicionales de alcance ni afecta a ninguna otra aplicación de la
plataforma (Psicoclinic, MariaDB u otros contenedores del servidor).
