# Llavero Seguro — Design System (MASTER)

Fuente de verdad para la evolución responsive de la UI. Generado a partir del sistema de tokens ya presente en `src/styles/global.css` (capa primitiva + semántica ya existente), extendido con la capa de breakpoints/layout necesaria para desktop. No se reescribe nada existente: esto documenta y fija el vocabulario que usará la implementación.

## 1. Principio rector

Mobile-first se mantiene intacto como el estado base (sin media query = comportamiento actual a 375–430px). Todo lo nuevo para desktop entra exclusivamente vía `@media (min-width: …)` que **añade o sobrescribe**, nunca elimina la base.

## 2. Breakpoints (nuevo — capa de layout)

```css
--bp-tablet: 768px;   /* transición: más aire, sigue siendo layout de 1 columna */
--bp-desktop-sm: 1024px; /* sidebar reemplaza bottom-nav; aparecen grids multi-columna */
--bp-desktop-md: 1280px; /* objetivo principal del usuario */
--bp-desktop-lg: 1440px; /* objetivo principal del usuario */
--bp-desktop-xl: 1920px; /* objetivo principal del usuario */
```

Regla de aplicación: `1024px` es el punto de corte navegación (bottom-nav → sidebar). `1280/1440/1920` ajustan **densidad de columnas y max-width del contenido**, no la navegación (que ya cambió en 1024).

## 3. Contenedores (nuevo)

Hoy: `.app-shell { width: min(100%, 720px); }` — válido tal cual para mobile/tablet.

Desktop (≥1024px):
```css
--sidebar-width: 264px;
--content-max-width: 1120px;   /* aplica a partir de 1280px; entre 1024–1279px el contenido usa el ancho disponible */
--content-max-width-xl: 1280px; /* a partir de 1920px, para no estirar en pantallas muy anchas */
--content-padding-desktop: 40px;
```

Layout desktop: `.app-shell` pasa a `display:grid; grid-template-columns: var(--sidebar-width) minmax(0,1fr);`. El área de contenido centra su propio `max-width` interno — el shell en sí ocupa 100vw, evitando el recalculo de offsets fijos (fab/toast/bottom-nav) que hoy dependen de los 720px.

## 4. Navegación (nuevo componente: Sidebar)

- <1024px: `BottomNav` (sin cambios).
- ≥1024px: `Sidebar` persistente a la izquierda, mismos 3 items (`Inicio`, `Nueva`, `Seguridad`), mismo `AppView`/`onNavigate`. Estado activo reutiliza `.nav-item.active` semántica pero con layout vertical y label visible siempre (no solo icono).
- Fuente de items compartida: extraer el array `items` de `BottomNav.tsx` a `src/domain/navItems.ts` para que `Sidebar` y `BottomNav` no diverjan.

## 5. Grids de contenido (nuevo)

| Elemento | Mobile (actual) | ≥1024px | ≥1440px |
|---|---|---|---|
| `.password-list` | 1 columna | 2 columnas | 3 columnas |
| `.security-stat-list` | 2 columnas (ya) | 3 columnas | 3 columnas |
| `.stats-grid` | 3 columnas (ya, apretado) | 3 columnas con más padding | 3 columnas |
| Overview + Herramientas (SecurityPage) | apiladas | 2 columnas lado a lado | 2 columnas, gap mayor |
| `.profile-list` (VaultSelectorPage) | 1 columna | 2 columnas | 2–3 columnas |

Regla: usar `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))` donde el contenido es homogéneo (password cards, profile cards) para que el número de columnas sea fluido entre 1024/1280/1440/1920 sin breakpoints manuales por cada card grid.

## 6. Modales / hojas (bottom sheets → diálogos)

Mobile: `.credential-modal`, `.modal-panel`, `.settings-modal` son bottom-sheets (`place-items: end center`, bordes redondeados solo arriba).

Desktop (≥768px, no solo ≥1024): pasan a diálogo centrado clásico — `place-items: center`, `border-radius` completo, `max-width` fijo (520–640px), sin el `sheet-handle`. Esto ya tiene precedente parcial en el código (`.credential-modal-backdrop` usa `place-items: end center` — se sobrescribe solo el `place-items` y radios en el breakpoint, reutilizando el resto de la regla).

## 7. Interacción de escritorio (nuevo)

```css
@media (hover: hover) and (pointer: fine) {
  /* hover states ya definidos en global.css (:hover en botones/cards) 
     se restringen a este media query para no dejar "hover pegado" en touch */
}
```

- `:focus-visible` ya existe globalmente (outline 3px `rgba(31,154,165,.28)`) — se mantiene, se **añade** contraste reforzado en fondos oscuros de sidebar activo si aplica.
- Tamaños táctiles mínimos (`min-height: 44px`) se mantienen en mobile; en desktop pueden reducirse ligeramente en elementos densos de sidebar/tabla (36–40px) ya que no son touch targets primarios.

## 8. Tipografía / espaciado desktop (ajuste, no reemplazo)

- `h1`: `2rem` mobile → `clamp` ya usado en varios lados; añadir techo de `2.5rem` en ≥1280px donde hoy hay `clamp(2rem, 8vw, 2.35rem)` (el `8vw` se vuelve absurdo en pantallas anchas — corregir a `clamp` con techo fijo independiente de `vw` en desktop).
- `.page`: `padding-inline` pasa de `18–26px` (mobile/tablet) a `var(--content-padding-desktop)` dentro del área de contenido (no en el shell completo) en ≥1024px.

## 9. Anti-patrones a evitar (checklist de validación final)

- [ ] Ningún elemento con `width: 100vw` o `min-width` fijo mayor al viewport en 1280/1440/1920.
- [ ] `overflow-x` del `body`/`#root` permanece `hidden` sin que ningún hijo fuerce scroll horizontal.
- [ ] Ningún `.fab`/`.toast`/banner fijo queda calculado sobre 720px cuando el shell ya es full-width en desktop (recalcular sus `right`/`left` respecto al nuevo layout con sidebar).
- [ ] Contenido no se estira sin límite: todo bloque de texto/formulario respeta `--content-max-width`.
- [ ] Bottom-nav no coexiste visualmente con Sidebar (uno de los dos, nunca ambos renderizados a la vez visualmente — usar `display:none` por breakpoint, no desmontar/montar si complica estado).
- [ ] Line-length de párrafos largos (`.notes-box`, `.security-recommendations`) no supera ~75ch en desktop.

## 10. Estado

`v1 — 2026-07-13`. Este documento se actualiza cada vez que se apruebe un cambio de token/breakpoint durante la implementación responsive. No mover valores aquí sin reflejarlos en `global.css`.
