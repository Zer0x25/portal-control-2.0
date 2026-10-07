# BDD 013: Empleados

1. Quiosco público devuelve solo activos y seis campos; sin PIN/email/contador.
2. Usuario vinculado recibe solo su fila, sin PIN y con metadata de sync.
3. Supervisor crea empleado y cuenta opcional en la misma transacción directa.
4. Fallo de ensure revierte empleado; sin evento/auditoría de alta exitosa.
5. JWT Admin con rol persistido Usuario recibe 403 en mutaciones/Excel; sin token 401. Reloj_Control conserva autorización supervisor.
6. Lote de 51 filas con última inválida recibe 400 antes de escrituras. Válido
   responde 200 success/count y emite count.
7. PUT inexistente devuelve 404; POST RUT duplicado 409; sin evento de éxito.
8. Archivo sincroniza cuenta a Archivado; activación restaura Usuario/credenciales.
9. Excel filtrado contiene ocho columnas, filas coincidentes, filename vigente,
   sin columna ni valor PIN.
10. Alta mayor a 1 MiB recibe 413; bulk entre 1–10 MiB llega a aplicación,
    mayor a 10 MiB recibe 413 sin escrituras.
