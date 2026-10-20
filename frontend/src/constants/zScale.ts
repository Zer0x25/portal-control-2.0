/**
 * Escala z-index del design system (spec 031 T17 / AC11).
 *
 * Nombres unificados; los valores conservan el orden relativo de los numeros
 * magicos previos para no alterar el apilado de la UI:
 *
 * | nivel      | clase  | uso                                        |
 * |------------|--------|--------------------------------------------|
 * | `base`     | `z-0`  | contenido de pagina                        |
 * | `sticky`   | `z-10` | cabeceras y tablas sticky, celdas          |
 * | `dropdown` | `z-20` | menus, popovers, paneles desplegables      |
 * | `overlay`  | `z-30` | drawers, backdrops y superficies flotantes |
 * | `modal`    | `z-40` | modales de dominio y dialogos              |
 * | `max`      | `z-50` | modales de app (CinematicModal, About)     |
 * | `toast`    | `z-60` | toasts, loading bar y overlays de pantalla |
 *
 * Uso: `className={`${Z.modal} flex items-center`}`.
 * El guardrail `zScaleGuardrails.test.ts` bloquea nuevos numeros magicos.
 */
export const Z = {
  base: "z-0",
  sticky: "z-10",
  dropdown: "z-20",
  overlay: "z-30",
  modal: "z-40",
  max: "z-50",
  toast: "z-60",
} as const;

export type ZLevel = keyof typeof Z;
