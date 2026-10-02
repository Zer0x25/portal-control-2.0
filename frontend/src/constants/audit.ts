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
  { id: "CRITICAL", label: "Crítico", color: "bg-red-600" },
  { id: "HIGH", label: "Alto", color: "bg-orange-600" },
  { id: "WARNING", label: "Advertencia", color: "bg-amber-500" },
  { id: "INFO", label: "Información", color: "bg-indigo-600" },
];
