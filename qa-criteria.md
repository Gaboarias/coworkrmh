# QA Success Criteria — Pistachio (cowork-rmh)

**Target:** https://cowork-rmh.vercel.app (producción)
**Auth:** `TEST_USERNAME` / `TEST_PASSWORD` en `.env.local` (no commiteado)
**Idioma de la UI:** español — los asserts de texto van en español.
**Generado:** 2026-07-30, a partir de las rutas en `src/app` y el IA de `Sidebar.tsx`.

---

## ⛔ ZONA PROHIBIDA — no tocar en producción

Estas acciones son **irreversibles o salen hacia afuera**. Ningún agente (Quinn ni
Jinx) debe ejecutarlas contra producción. Verificar que el control *existe y se
renderiza*, pero **nunca confirmar la acción**.

| Área | Acción prohibida | Por qué |
|------|------------------|---------|
| `/marketing/[id]` | **"Lanzar campaña"** / cualquier botón de envío | `POST /api/campaigns/[id]/launch` → `processCampaignQueue` → `resend.batch.send()`. **Manda email real a clientes reales.** Imposible de deshacer. |
| `/admin` | Cambiar rol de un usuario | `PATCH /api/users/[userId]/role`. Puede dejarte fuera de tu propia cuenta. |
| `/admin` | Resetear contraseña de otro usuario | `POST /api/users/[userId]/password` y `/reset-link` — invalida el acceso de una persona real. |
| `/admin` | Quitar/asignar entornos a usuarios | `PUT /api/users/[userId]/workspaces` — cambia permisos reales. |
| Cualquiera | Botones de **Eliminar / Borrar / Archivar** sobre datos preexistentes | Data real de RMH. Solo borrar lo que el propio test creó. |
| `/settings` | Cambiar la contraseña de la cuenta de test | Rompe las corridas siguientes. |
| Portal cliente | Generar/rotar el token público de un cliente real | Invalida el enlace que el cliente ya tiene. |
| `/api/unsubscribe` | Visitar un enlace de baja real | Da de baja a un contacto real. |

**Regla de datos de prueba:** todo lo que se cree lleva el prefijo `QA-TEST-` en el
nombre (`QA-TEST-proyecto-01`, `QA-TEST-cliente-01`, …) para poder identificarlo y
limpiarlo después. Registrar en el reporte final la lista completa de lo creado.

---

## Convenciones

- **Prioridad:** P0 = bloqueante (rompe el negocio) · P1 = importante · P2 = menor · P3 = cosmético.
- Cada criterio se prueba **solo por UI**, como lo haría una persona.
- Screenshot antes y después; siempre screenshot al fallar.
- Un fallo no detiene la corrida: se registra y se sigue.

---

## 1. Autenticación y sesión

| # | Criterio | Prioridad |
|---|----------|-----------|
| 1.1 | `/` sin sesión redirige a la pantalla de login (`Correo electrónico`, `Contraseña`, `Iniciar sesión`). | P0 |
| 1.2 | Login con credenciales válidas entra y aterriza en `/dashboard`. | P0 |
| 1.3 | Login con contraseña incorrecta muestra un error legible y **no** entra. | P0 |
| 1.4 | Login con email inexistente muestra error genérico (no revela si el usuario existe). | P1 |
| 1.5 | Con sesión abierta, ir a `/login` no deja ver el formulario otra vez (redirige a la app). | P2 |
| 1.6 | Sin sesión, `/dashboard`, `/projects`, `/admin`, `/operations` redirigen a login — no muestran contenido ni parpadeo de datos. | P0 |
| 1.7 | "¿Olvidaste tu contraseña?" lleva a `/reset-password` y el formulario acepta un email sin romperse. **No completar el flujo con un email real ajeno.** | P2 |
| 1.8 | Cerrar sesión (menú de avatar) termina la sesión y vuelve a login; el botón "atrás" del navegador no restaura la app. | P0 |

## 2. Navegación e information architecture

Secciones del sidebar: **Trabajo** (Resumen, Proyectos, Mis tareas) · **Negocio**
(Operaciones, Clientes) · **Crecimiento** (Reportes, Campañas) · **Sistema** (Admin),
más Configuración en el pie.

| # | Criterio | Prioridad |
|---|----------|-----------|
| 2.1 | Cada ítem del sidebar navega a su ruta y queda marcado como activo (negrita + barra de acento a la izquierda). | P0 |
| 2.2 | Los ítems `adminOnly` (Clientes, Campañas, Admin) **no** se renderizan para un usuario `member`. | P0 |
| 2.3 | Un `member` que navega directo a `/admin` por URL es rechazado (no ve el panel). | P0 |
| 2.4 | Colapsar/expandir el sidebar funciona, muestra solo íconos al colapsar, y el estado sobrevive a recargar. | P2 |
| 2.5 | El atajo ⌘B / Ctrl+B alterna el sidebar. | P3 |
| 2.6 | El EntornoSwitcher lista los entornos y cambiar de entorno recarga los datos del entorno elegido. | P0 |
| 2.7 | En un entorno `basic`, los ítems premium (Operaciones, Reportes, Campañas) desaparecen del sidebar. | P1 |
| 2.8 | Los breadcrumbs reflejan la ruta real y sus enlaces navegan bien. | P2 |
| 2.9 | La paleta de comandos (⌘K) abre, busca y navega al resultado elegido. | P1 |
| 2.10 | La campana de notificaciones abre el panel; "marcar todas como leídas" pone el contador en 0. | P1 |

## 3. Dashboard (`/dashboard`)

| # | Criterio | Prioridad |
|---|----------|-----------|
| 3.1 | Carga sin error y muestra el bloque "Atención" (tareas urgentes/vencidas + pagos vencidos) **antes** del detalle. | P0 |
| 3.2 | Sin nada pendiente, el bloque muestra "Todo al día" en vez de tarjetas vacías. | P1 |
| 3.3 | Los ítems de "Atención" hacen drill-down a `/projects` (o al recurso correcto). | P1 |
| 3.4 | Ningún KPI muestra `NaN`, `undefined`, `null` ni `Invalid Date`. | P0 |
| 3.5 | Los montos salen en formato de moneda de Costa Rica (₡) y las fechas con `formatDateCR` — sin corrimiento de un día por timezone. | P1 |

## 4. Proyectos

| # | Criterio | Prioridad |
|---|----------|-----------|
| 4.1 | `/projects` lista los proyectos del entorno activo. | P0 |
| 4.2 | Los tabs de categoría (bucket) **con 0 proyectos no se muestran**. | P2 |
| 4.3 | `/projects/new` crea un proyecto (`QA-TEST-proyecto-01`) y redirige a su detalle. | P0 |
| 4.4 | Crear con el nombre vacío se bloquea con un mensaje de validación claro. | P1 |
| 4.5 | El hero del detalle muestra la descripción larga como **texto de cuerpo (17px)**, no como subtítulo gigante en itálica. | P1 |
| 4.6 | Sin subtítulo, el título no queda con una coma colgante. | P3 |
| 4.7 | Se puede crear una tarea dentro del proyecto y aparece en la lista al instante. | P0 |
| 4.8 | Cambiar el estado de una tarea persiste tras recargar. | P0 |
| 4.9 | El drag & drop del board mueve la tarjeta de columna y persiste. | P1 |
| 4.10 | Tab **Notas**: crear una nota, escribir en el editor TipTap (negrita, lista, checklist) y que guarde. | P1 |
| 4.11 | Tab **Documentos**: la lista carga y los tamaños salen con `formatBytes` (no bytes crudos). | P1 |
| 4.12 | Subir un archivo de tipo no permitido es **rechazado** (el allowlist de MIME se aplica). | P0 |
| 4.13 | Tab **Reportes**: las descripciones largas se truncan con toggle "ver más / ver menos", y el toggle **solo aparece si el texto realmente se corta**. | P1 |
| 4.14 | Tab **Historial**: muestra los cambios en orden cronológico con autor y fecha. | P2 |
| 4.15 | Tab **Configuración**: los cambios guardan y se reflejan en el detalle. | P1 |
| 4.16 | Un `projectId` inexistente da un 404/estado vacío decente, no una pantalla en blanco ni un stack trace. | P1 |

## 5. Mis tareas (`/my-tasks`)

| # | Criterio | Prioridad |
|---|----------|-----------|
| 5.1 | Lista las tareas asignadas al usuario logueado. | P0 |
| 5.2 | El switch **Lista | Calendario** alterna las dos vistas sin recargar. | P1 |
| 5.3 | La vista Calendario ubica las tareas en la fecha correcta (sin corrimiento por timezone). | P1 |
| 5.4 | Con más de 10 completadas, aparece la línea mono **"Mostrando 10 de N"** y N coincide con el total real. | P1 |
| 5.5 | Con 10 o menos completadas, ese aviso **no** aparece. | P2 |
| 5.6 | Completar una tarea la mueve a Completadas y persiste tras recargar. | P0 |

## 6. Operaciones / ERP (premium)

| # | Criterio | Prioridad |
|---|----------|-----------|
| 6.1 | `/operations` con entorno vacío muestra un **panel neutro** (superficie + borde hairline + ícono), **no** un callout rojo de error. | P1 |
| 6.2 | Con entorno vacío **no** se renderiza la grilla de 6 KPIs en ₡0; el CTA de cargar catálogo va primero. | P1 |
| 6.3 | El hero va antes de `OperationsNav` en la landing de Operaciones. | P3 |
| 6.4 | `/operations/catalogo` lista productos; se puede crear `QA-TEST-producto-01`. | P0 |
| 6.5 | `/operations/cotizador` lista cotizaciones; `/nuevo` crea una y calcula los totales bien. | P0 |
| 6.6 | Los totales de la cotización recalculan al cambiar cantidad o precio, sin errores de redondeo. | P0 |
| 6.7 | `/operations/ventas` y `/gastos` cargan y sus tablas ordenan/filtran. | P1 |
| 6.8 | El **DensityToggle** (compacto/cómodo) cambia la altura de fila en ventas, gastos y catálogo, y persiste en localStorage. | P2 |
| 6.9 | `/operations/equipo` carga sin error. | P1 |
| 6.10 | Subir imagen de producto respeta el límite de tamaño y el allowlist de MIME. | P0 |

## 7. Clientes, Reportes, Campañas, Admin

| # | Criterio | Prioridad |
|---|----------|-----------|
| 7.1 | `/clients` (admin) lista clientes; se puede crear `QA-TEST-cliente-01`. | P0 |
| 7.2 | Generar el portal de cliente produce un enlace — **solo sobre `QA-TEST-cliente-01`, nunca sobre un cliente real**. | P1 |
| 7.3 | El portal `/[token]` abre **sin sesión** y muestra solo los datos de ese cliente. | P0 |
| 7.4 | Un token inválido/manipulado **no** filtra datos de otro cliente. | P0 |
| 7.5 | El portal formatea las fechas con mes en palabra (`month: "long"`). | P3 |
| 7.6 | `/reports` carga los gráficos de Recharts sin error de consola. | P1 |
| 7.7 | `/marketing` lista campañas y `/marketing/[id]` abre el detalle. **Sin lanzar nada.** | P1 |
| 7.8 | En el detalle de campaña, el botón de lanzar existe y se ve — **verificar presencia únicamente, jamás hacer clic**. | P0 |
| 7.9 | `/admin` carga el panel para admin y lista usuarios. | P1 |
| 7.10 | El admin **no puede auto-degradarse** ni dejar el sistema sin ningún admin — el guard bloquea con mensaje claro. *(Verificar el guard sobre la propia cuenta de test es aceptable **solo** si el intento es rechazado; si llegara a aplicarse, es un fallo P0 y hay que reportarlo de inmediato.)* | P0 |
| 7.11 | `/notifications` lista el historial y marcar como leída persiste. | P2 |
| 7.12 | `/settings` carga; cambiar nombre/avatar guarda. **No cambiar la contraseña.** | P1 |

## 8. Transversal (tema, responsive, consola)

| # | Criterio | Prioridad |
|---|----------|-----------|
| 8.1 | El ThemeToggle alterna claro/oscuro, persiste al recargar y **no** produce flash de tema incorrecto. | P1 |
| 8.2 | En modo oscuro ningún texto queda ilegible (contraste suficiente en tarjetas, pills y tablas). | P1 |
| 8.3 | A 375×667 el sidebar es un drawer con backdrop, se cierra al navegar y no hay scroll horizontal. | P0 |
| 8.4 | A 768×1024 y 1280×720 el layout no se rompe ni se solapa. | P1 |
| 8.5 | A 1920×1080 el contenido no queda estirado ni con huecos absurdos. | P3 |
| 8.6 | Ninguna página de la navegación principal lanza errores de consola no capturados. | P1 |
| 8.7 | Los modales cierran con Escape, con la X y clicando el overlay. | P1 |
| 8.8 | Las animaciones de motion respetan `prefers-reduced-motion`. | P2 |
| 8.9 | Ninguna vista deja spinners infinitos: todo llega a contenido, vacío o error. | P0 |

---

## Notas para Jinx (modo adversario)

Aplicar las categorías de ataque del skill **excepto** lo listado en la Zona
Prohibida. Foco recomendado en esta app:

- **Inputs:** nombres de proyecto/cliente de 1000+ caracteres; emoji y texto RTL en
  el editor TipTap; `<script>` en descripciones; montos negativos y decimales
  absurdos en el cotizador; fechas año 1900 y 2999 en tareas.
- **Interacción:** doble clic en "Crear proyecto" (¿crea dos?); clic repetido en
  guardar; clic durante la transición de ruta.
- **Navegación:** back durante el submit de un formulario; refresh a mitad del
  cotizador; `projectId`/`token` manipulados en la URL.
- **Estado:** enviar formularios vacíos; abrir el mismo modal dos veces; cambiar de
  entorno con un formulario a medio llenar.
- **Visual:** 320px y 5000px de ancho; zoom 200% y 50%; descripción larguísima en
  una tarjeta de reporte y en el hero de proyecto.

Toda campaña, usuario o cliente real queda fuera del alcance. Ante la duda sobre si
una acción es reversible: **no la ejecutes, y regístrala como "no probada por
riesgo"** en el reporte.
