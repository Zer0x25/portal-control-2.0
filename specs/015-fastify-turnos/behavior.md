# BDD 015

1. Supervisor crea patrón/asignación válidos, recibe 201 y evento/sync existente.
2. Mismo día final/inicial solapa; día siguiente permite nueva asignación.
3. Horario incompleto produce 400; conflicto de asignación 400. Patrón ausente
   DELETE mantiene 204, asignación ausente conserva error heredado.
4. Usuario consulta assignments con employeeId ajeno: solo los propios. Calendario
   diario/mensual ajeno devuelve 403 y matriz ignora employeeIds enviados.
5. Última fila inválida del lote se rechaza antes de writes. Patrones/asignaciones
   válidos devuelven 201 count; bulk 10 MiB, simple 1 MiB.
6. Plan mensual futuro guarda patrón ad hoc y asignación; mes pasado 400. Un fallo
   de persistencia tras tocar conflictos revierte toda la transacción directa.
7. JWT Admin con rol persistido Usuario recibe 403 para operaciones supervisor.
8. Empleado con patrón diario/feriado marca entrada: snapshot de planificación y
   hash de integridad persistidos y calendario concordante en ambos servidores.
9. query parseInt/showArchived/since y cuerpos extra preservan comportamiento.

10. Matriz de Usuario/quiosco sin empleado asociado devuelve 403 antes de consultar BD.
11. Plan guarda trabajo día 1 y descanso día 2; endpoint diario los devuelve bien.
    Vista mensual conserva defecto UTC/Chile: etiqueta día 1 con estado del previo
    y día 2 con estado del día 1. Prueba de caracterización en ambos transportes.
12. Matriz de once empleados usa un contexto compartido y no consultas por empleado/día.
