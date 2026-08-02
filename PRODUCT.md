# Product

## Register

product

## Users

Equipo interno de Rewind Media House. Tres perfiles reales:

- **Líderes de proyecto** — viven en `/projects`, `/my-tasks` y `/calendar`. Sesiones
  largas, varias horas al día, mismo puñado de pantallas. Ya saben dónde está todo;
  no necesitan que se los expliquen, necesitan llegar rápido.
- **Operaciones / administración** — viven en `/operations/[negocio]`: catálogo,
  cotizador, ventas, gastos, cobros. Trabajan con números y los revisan dos veces.
  Errores acá cuestan plata.
- **Admin** — `/admin`: usuarios, negocios, permisos. Uso esporádico pero de alto
  impacto, casi siempre irreversible.

Contexto de uso: escritorio, jornada laboral, español, una sola pestaña abierta
durante horas. No es una app que se descubra: se aprende una vez y se usa mil.

## Product Purpose

Reemplazar la dispersión (planillas + chats + carpetas) con una sola herramienta que
sostenga gestión de proyectos y el ERP por negocio en el mismo lugar. Multi-negocio
vía buckets, con acceso por equipo.

Éxito = alguien abre Pistachio a las 9am y no necesita abrir nada más para saber qué
hacer hoy ni para cerrar una cotización.

## Brand Personality

**Calma, sin fricción, precisa.**

La app no compite por atención: es el fondo sobre el que pasa el trabajo. El tono
escrito es directo y en español neutro, sin jerga de producto ni entusiasmo forzado.
Nada celebra, nada urge salvo lo que de verdad es urgente.

La calma no se consigue quitando color ni información, sino **reduciendo la cantidad
de cosas que piden algo**. Una acción principal por pantalla, y que se note.

## Anti-references

- **Dashboard SaaS genérico.** Grillas de tarjetas idénticas con icono + título +
  texto, la métrica gigante con gradiente encima de tres stats de apoyo, iconos
  multicolor por categoría. Es la respuesta por defecto y siempre se nota.
- Derivados directos que también quedan fuera: tarjetas anidadas, glassmorphism
  decorativo, texto con gradiente, y el borde de color a la izquierda como acento.

## Design Principles

1. **Una voz alta por pantalla.** El CTA sólido habla en mono/mayúscula con tracking
   ancho; es el único elemento con permiso para levantar la voz. Todo lo secundario
   (ghost, outline, enlaces) se queda en sentence-case y baja el tono. Si dos cosas
   gritan, ninguna se oye.
2. **Un nombre por cosa.** Si existe un primitivo, se usa. Escribir a mano las clases
   de un botón que ya existe no es un atajo, es una variante nueva sin nombre que
   alguien va a tener que reconciliar después.
3. **El estado se lee sin color.** Color **+ icono + etiqueta**, nunca color solo.
   Vale para prioridades, estados de proyecto, estados de pago.
4. **Densidad con jerarquía, no densidad plana.** Se puede mostrar mucho; lo que no
   se puede es mostrarlo todo con el mismo peso. El espaciado varía para crear ritmo.
5. **Lo irreversible se siente distinto.** Archivar, eliminar, cambiar permisos: la
   interfaz tiene que pesar más ahí que en guardar un título.

## Accessibility & Inclusion

- Objetivo de trabajo: **WCAG 2.1 AA**. _(Asumido a falta de un requisito explícito
  del equipo — confirmar y ajustar.)_
- Estado y acción nunca dependen solo del color (principio 3).
- `:focus-visible` visible en todo control accionable; ya hay un anillo global en
  `globals.css` sobre `--project-color`.
- Interfaz en español; los textos crecen ~20% respecto al inglés. Los controles no
  pueden depender de anchos fijos ajustados a la etiqueta más corta.
