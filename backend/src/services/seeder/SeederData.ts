export const firstNames = [
  "Ana",
  "Bruno",
  "Carla",
  "David",
  "Elena",
  "Franco",
  "Gilda",
  "Hector",
  "Irene",
  "Jorge",
  "Karla",
  "Luis",
  "Maria",
  "Nestor",
  "Olga",
  "Pedro",
  "Quintin",
  "Rosa",
  "Sergio",
  "Teresa",
  "Ursula",
  "Victor",
  "Sofia",
  "Mateo",
  "Valentina",
  "Santiago",
  "Isabella",
  "Sebastian",
  "Camila",
  "Matias",
  "Diego",
  "Valeria",
  "Daniel",
  "Renata",
  "Alejandro",
  "Ximena",
  "Emiliano",
  "Regina",
];

export const paternalSurnames = [
  "Garcia",
  "Rodriguez",
  "Gonzalez",
  "Fernandez",
  "Lopez",
  "Martinez",
  "Sanchez",
  "Perez",
  "Gomez",
  "Martin",
  "Jimenez",
  "Ruiz",
  "Hernandez",
  "Diaz",
  "Moreno",
  "Munoz",
  "Alvarez",
  "Romero",
  "Alonso",
  "Gutierrez",
  "Navarro",
  "Torres",
  "Dominguez",
  "Ramos",
  "Gil",
  "Ramirez",
  "Serrano",
  "Blanco",
  "Molina",
];

export const maternalSurnames = [
  "Castillo",
  "Ortega",
  "Morales",
  "Reyes",
  "Guerrero",
  "Cano",
  "Prieto",
  "Mendez",
  "Cruz",
  "Calderon",
  "Vega",
  "Nunez",
  "Rojas",
  "Herrera",
  "Flores",
  "Aguilar",
  "Paredes",
  "Salazar",
  "Acosta",
  "Medina",
  "Campos",
  "Rivas",
  "Silva",
  "Soto",
  "Delgado",
  "Vargas",
  "Ponce",
  "Cabrera",
  "Rios",
  "Osorio",
];

export const positions = [
  "Guardia de Seguridad",
  "Operador de CCTV",
  "Tecnico de Mantenimiento",
  "Administrativo de Operaciones",
  "Supervisor de Turno",
  "Analista de Seguridad",
  "Jefe de Turno",
  "Bodeguero",
  "Recepcionista",
  "Auxiliar de Limpieza",
];

export const areas = [
  "Seguridad Perimetral",
  "Logistica y Almacen",
  "Mantenimiento de Infraestructura",
  "Oficinas Administrativas",
  "Control de Acceso",
  "Centro de Monitoreo",
];

export const shiftNames = ["Turno Dia", "Turno Tarde", "Turno Noche"];
export const leaveTypes = ["Vacaciones", "Licencia Médica", "Permiso Especial"];
export const correctionFields = ["entrada", "inicioColacion", "finColacion", "salida"] as const;

// Helper functions
export const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const yieldToEventLoop = () => new Promise((resolve) => setImmediate(resolve));

/** Gaussian-ish random: Box-Muller transform */
export function gaussRandom(mean: number, stdDev: number): number {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdDev;
}

/** Parse "HH:MM" to total minutes */
export function parseMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function calculateDv(rutBody: number): string {
  let M = 0;
  let S = 1;
  for (let T = rutBody; T > 0; T = Math.floor(T / 10)) {
    S = (S + (T % 10) * (9 - (M++ % 6))) % 11;
  }
  return S > 0 ? String(S - 1) : "K";
}
