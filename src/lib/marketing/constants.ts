/**
 * Constantes del Email Blaster.
 *
 * BUCKET: etiqueta de negocio para campañas. Los `clients` del CRM son globales
 * (no están scoped a workspace), así que hoy usamos un único bucket. El campo
 * existe en el schema para multi-business forward-compat sin migración futura.
 */
export const DEFAULT_BUCKET = "RMH";

/** From name por defecto del blaster (editable por campaña). */
export const DEFAULT_FROM_NAME = "ReWind Media House";
