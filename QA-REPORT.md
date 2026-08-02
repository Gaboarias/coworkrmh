# QA Test Report — Pistachio (cowork-rmh)

**URL:** https://cowork-rmh.vercel.app (producción, commit `9059bcd`)
**Fecha:** 2026-07-30
**Modo ejecutado:** Discovery + Standard (subconjunto **solo-lectura**)
**Modo NO ejecutado:** Adversary (Jinx) — ver "Cobertura" al final
**Entorno activo durante la corrida:** `Probe 2026-06-04T23:40:55` (vacío)
**Evidencia:** 25 screenshots en
`C:\Users\garia\AppData\Local\Temp\claude\c--Users-garia-OneDrive-Documents-GitHub-coworkrmh\a388c6fd-5e42-4876-b814-396591252a7b\scratchpad\out\`

**Estado general:** 16/16 rutas cargan con HTTP 200. **4 hallazgos** — 1 de ellos
rompe la identidad visual de toda la app en producción ahora mismo.

> Nota de método: no había Playwright MCP instalado, así que la corrida se hizo
> manejando Playwright directamente desde Node. Se dejó `.mcp.json` listo para que
> el skill funcione normal después de reiniciar la sesión.

---

## Hallazgos

### 🔴 P0 — La fuente Satoshi no carga en ningún lado: toda la app usa el fallback

**Dónde:** todas las páginas. Origen: [src/app/layout.tsx:36](src/app/layout.tsx#L36)

`<link rel="stylesheet">` pide a Fontshare **todos los pesos + itálicas**:

```
https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900,300i,400i,500i,700i,900i&display=swap
```

Ese request devuelve **HTTP 500**. El navegador lo descarta
(`net::ERR_BLOCKED_BY_ORB`, 23 veces en el crawl) y **no se registra ni un solo
`@font-face` de Satoshi**. Todo se renderiza con `system-ui`.

**Causa raíz aislada — son las itálicas.** Satoshi no tiene corte itálico en
Fontshare, y pedirlo hace fallar el request **entero**, no solo las itálicas:

| URL probada | Resultado |
|---|---|
| `satoshi@400` | ✅ 200 |
| `satoshi@300,400,500,700,900` | ✅ 200 — 2921 bytes, los 5 pesos |
| `satoshi@400i` | ❌ 500 |
| `satoshi@300i` · `satoshi@900i` | ❌ 500 |
| `satoshi@300,400,500,700,900,400i` | ❌ 500 |
| `general-sans@400` (control) | ✅ 200 — la API está arriba |

**Evidencia en runtime:** `document.fonts` no contiene ninguna familia Satoshi
(`satoshiFaces: []`). Medición de ancho de texto a 64px: pedir `'Satoshi', monospace`
da **668.5625px**, exactamente igual que pedir `monospace` solo → cae hasta el
último fallback. En `shots/dashboard.png` se ve una sans genérica del sistema, y
"buen jueves." es una **oblicua sintética**, no una itálica real.

**Fix (una línea):** quitar los tokens de itálica del href.

```diff
- href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900,300i,400i,500i,700i,900i&display=swap"
+ href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap"
```

**Consecuencia a decidir:** el gesto signature de Edition 04 — el drop-line en
itálica de [PageHeader.tsx:62-65](src/components/shared/PageHeader.tsx#L62-L65) — no
tiene corte real disponible en esta fuente. Hoy el navegador ya lo sintetiza (desde
system-ui); con el fix lo sintetizará desde Satoshi. Si se quiere itálica de verdad
hay que traerla de otra fuente o auto-hospedar el archivo.

**Además:** es un stylesheet de tercero que bloquea el render en `<head>`. Mientras
devuelva 500 se paga la latencia en cada carga sin obtener nada.

---

### 🟠 P1 — Ninguna página tiene `<h1>`: el título visual es un `<span>`

**Dónde:** las 10 rutas medidas. Origen: [PageHeader.tsx:62-65](src/components/shared/PageHeader.tsx#L62-L65)

El título que se ve a 84px ("Proyectos,", "Operaciones,", "Mis tareas,") se renderiza
como `<div class="title-drop"><span>{title}</span></div>` — sin semántica de heading.

| Ruta | `<h1>` | headings totales | título visual |
|---|---|---|---|
| /dashboard | 0 | **0** | `SPAN` 84px "Hola, Gabo," |
| /operations | 0 | **0** | `SPAN` 84px "Operaciones," |
| /clients | 0 | **0** | `SPAN` 84px "Clientes," |
| /reports | 0 | **0** | `SPAN` 84px "Julio," |
| /marketing | 0 | **0** | `SPAN` 84px "Email blaster," |
| /notifications | 0 | **0** | `SPAN` 84px "Notificaciones," |
| /projects · /my-tasks · /admin | 0 | 1 (`H3`) | `SPAN` 84px |
| /settings | 0 | 2 (`H3`) | `SPAN` 84px |

Seis páginas no tienen **ningún** heading. Donde hay, arranca en `H3` — saltándose
H1 y H2.

**Impacto:** incumple WCAG 2.2 **1.3.1 Info and Relationships** (nivel A) y
**2.4.6 Headings and Labels** (AA). Quien usa lector de pantalla no puede saltar al
título con la tecla `H`, y en 6 páginas no tiene ningún punto de referencia.

**Fix:** que el span externo de `PageHeader` sea `<h1>` (el CSS de `.title-drop` ya
controla tamaño y peso, así que no cambia nada visual), y subir los `H3` sueltos a
`H2`.

---

### 🟡 P2 — Las notificaciones no respetan el entorno activo

Con `Probe 2026-06-04T23:40:55` activo y `/projects` mostrando "Sin proyectos aún",
`/notifications` lista **29 notificaciones de otros 4 entornos**:

`Ronda Artesanal` · `Renta Swipe QA` · `Rewind Media House` · `Midnight Trouble`

Toda la app está scopeada al entorno activo; notificaciones no. Abrir una de esas
notificaciones además **cambia el entorno activo en silencio** al del proyecto
destino (verificado: entrar a `/projects/09d46bd2-…` dejó la sesión en
`Rewind Media House`).

**No es un fallo de seguridad** — la cuenta es miembro de esos entornos y el acceso
es legítimo. Es una inconsistencia de IA: o las notificaciones se filtran por
entorno, o muestran de qué entorno viene cada una y el cambio de contexto es
explícito. Evidencia: `shots/notifications-scoping.png`.

---

### 🟡 P2 — Todo login aterriza en un entorno de prueba vacío

6 logins independientes (contextos limpios) cayeron **siempre** en
`Probe 2026-06-04T23:40:55` — un entorno con 1 miembro y 0 proyectos. Es
determinístico, no aleatorio.

Consecuencia: al entrar, dashboard, proyectos, tareas y todo el ERP se ven vacíos, y
hay que cambiar de entorno a mano para llegar a `Rewind Media House` (9 miembros,
9 proyectos activos). "Probe 2026-06-04T23:40:55" parece data de prueba que quedó en
producción; además ordena primero alfabéticamente entre `Probe` / `RentaSwipe` /
`Rewind Media House` / `Ronda`, que es probablemente por qué gana.

**Fix:** borrar el entorno de prueba de producción, y/o persistir el último entorno
usado en vez de tomar el primero de la lista.

---

## Criterios verificados

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1.1 | `/` sin sesión → login | ✅ PASS | → `/login?callbackUrl=%2F` |
| 1.2 | Login válido → `/dashboard` | ✅ PASS | `shots/001-after-login.png` |
| 1.3 | Password incorrecta rechazada | ✅ PASS | 401 en `/api/auth/callback/credentials`, queda en login |
| 1.6 | Rutas protegidas sin sesión | ✅ PASS | `/dashboard`, `/admin`, `/operations` → login con `callbackUrl` |
| 2.1 | Sidebar navega y marca activo | ✅ PASS | 9 ítems + Configuración, todos 200 |
| 3.2 | "Todo al día" sin pendientes | ✅ PASS | `shots/dashboard.png` |
| 3.4 | Sin `NaN`/`undefined`/`Invalid Date` | ✅ PASS | ninguna ocurrencia en las 16 rutas |
| 6.1 | Empty state neutro, no callout rojo | ✅ PASS | 0 elementos rojizos en `main` |
| 6.2 | Sin grilla de KPIs en ₡0 | ✅ PASS | 0 ocurrencias de `₡0` |
| 8.1 | Theme toggle + persistencia | ✅ PASS | light→dark, sobrevive reload |
| 8.3 | 375px sin scroll horizontal | ✅ PASS | scrollWidth 375 = clientWidth; título baja a 36px |
| 8.6 | Sin errores de consola | ✅ PASS | 1 solo error, y era el 401 del test 1.3 |
| — | 320px extremo | ✅ PASS | scrollWidth 320, sin desborde |

Los `ERR_ABORTED` en `?_rsc=…` del crawl son prefetch de RSC cancelados al navegar
rápido — ruido normal de Next, no un fallo.

Las dos correcciones recientes de `main` quedaron **verificadas en producción**: el
empty state de Operaciones ya es neutro y sin KPIs en cero (criterios 6.1 y 6.2).

---

## Cobertura — qué falta

**No ejecutado: modo Adversary (Jinx) y todo criterio que escriba datos.** Esta
corrida fue deliberadamente solo-lectura: no se creó, editó ni borró nada en la base
de producción.

Queda sin probar: crear proyecto/tarea/cliente/producto, la aritmética del cotizador,
uploads y validación de MIME, drag & drop del board, editor TipTap, modales, paleta
de comandos, portal de cliente, y las categorías de ataque de Jinx.

**Cómo hacerlo con riesgo bajo:** el entorno `Probe 2026-06-04T23:40:55` está vacío y
aislado, y es donde la cuenta aterriza por defecto. Jinx puede correr confinado ahí
sin tocar la data de `Rewind Media House`. Se mantiene la Zona Prohibida de
[qa-criteria.md](qa-criteria.md) — en especial **no tocar "Enviar a N destinatarios"**
en `/marketing`, que dispara `resend.batch.send()` a clientes reales.

---

## Recomendaciones por prioridad

1. **Quitar los tokens de itálica del href de Fontshare** ([layout.tsx:36](src/app/layout.tsx#L36)). Un diff de una línea devuelve la tipografía de marca a toda la app.
2. **Convertir el título de `PageHeader` en `<h1>`.** Sin cambio visual, arregla WCAG A/AA en todas las páginas.
3. **Borrar el entorno `Probe 2026-06-04T23:40:55` de producción** y persistir el último entorno usado.
4. **Definir el comportamiento de notificaciones** entre entornos: filtrar, o etiquetar el origen y hacer explícito el cambio de contexto.
5. Correr Jinx confinado al entorno Probe para cerrar la cobertura de escritura.

---

## Entorno de prueba

- Navegador: Chromium headless 151.0.7922.34 (Playwright v1234)
- Viewports: 1280×720 · 375×667 · 320×640
- Rutas visitadas: 16 · Screenshots: 25
- Cuenta: `<admin>` (rol admin) — credenciales en `.env.local`, no versionadas
- Datos creados: **ninguno**
