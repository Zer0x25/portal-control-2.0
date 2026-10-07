# BDD 018: KPI

Spec: [spec.md](spec.md).

- Dado fin inclusivo igual al inicio, ambos reportes consultan un día; con fin
  exclusivo igual al inicio rechazan 400 antes de consultar el motor.
- Dado ambos fines, prevalece exclusivo; dos empleados admiten un año y un
  empleado admite cinco; employeeId singular no amplía ese límite.
- Dada BD vacía, summary devuelve kpis/kpiDetails vacíos, detailed summary/details
  vacíos; overview y daily devuelven contadores sin envelopes añadidos.
- Dado empleado y marcaje con snapshot de jornada, ambos adaptadores devuelven
  iguales horas, fechas y detalles; área/IDs filtran datos.
- Dado mes cerrado, consulta materializa caché; consultas posteriores reutilizan
  el valor aun si el marcaje cambia. JSON corrupto devuelve 500.
- Dada sesión ausente o rol persistido Usuario con JWT Admin, cada ruta devuelve
  401/403; Reloj_Control conserva acceso. Body inválido devuelve 400.
- Dado fallo real de almacenamiento, no hay respuesta exitosa ni efectos nuevos.

- Dado empleado con PIN, overview y detalle de ausencias nunca lo serializan.

- Dada fecha con formato incorrecto devuelve 400; 2026-02-30 conserva 200 legacy
  con BD vacía porque schema solo valida formato, no calendario.
