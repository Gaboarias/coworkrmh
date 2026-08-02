/**
 * Vencimientos ofrecidos para una invitación a un entorno.
 *
 * Vive fuera de `lib/actions/invitations.ts` por dos motivos. El técnico: un
 * archivo `"use server"` sólo puede exportar funciones async, así que una
 * constante ahí adentro rompe el build. El de fondo: la lista la necesitan el
 * `<Select>` que la dibuja y el action que la valida, y si cada uno tuviera la
 * suya, agregar una opción en la UI la dejaría rebotando en el servidor sin que
 * nadie entienda por qué.
 *
 * No hay opción "nunca" a propósito. Un link a un entorno que no vence es
 * exactamente lo que este diseño evita: adentro de un entorno está Operaciones
 * —ventas, gastos, márgenes, planilla— y un link permanente reenviado a un
 * grupo es un agujero que nadie recuerda haber abierto.
 */
export const INVITE_TTL_OPTIONS = [
  { days: 1, label: "24 horas" },
  { days: 7, label: "7 días" },
  { days: 30, label: "30 días" },
] as const;

export const INVITE_TTL_DAYS: readonly number[] = INVITE_TTL_OPTIONS.map(
  (o) => o.days
);

export const DEFAULT_INVITE_TTL_DAYS = 7;
