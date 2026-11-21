export const CATEGORY_GROUPS = [
  {
    name: "Sistema",
    categories: [
      { id: "AUTH", label: "Autenticación" },
      { id: "CONFIG", label: "Configuración" },
    ],
  },
  {
    name: "Administración",
    categories: [
      { id: "USER_MGMT", label: "Gestión de Usuarios" },
      { id: "SHIFT_MGMT", label: "Gestión de Turnos" },
    ],
  },
  {
    name: "Control Horario",
    categories: [{ id: "CTRL_HOURS", label: "Gestión de Tiempo" }],
  },
];

export const SEVERITIES = [
  { id: "CRITICAL", label: "Crítico", color: "bg-token-status-error" },
  { id: "HIGH", label: "Alto", color: "bg-token-status-sin-marcaje" },
  { id: "WARNING", label: "Advertencia", color: "bg-token-status-warning" },
  { id: "INFO", label: "Información", color: "bg-token-status-colacion" },
];
