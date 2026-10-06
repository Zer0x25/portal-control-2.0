# BDD 014

1. Usuario envía employeeId ajeno al fichar: usar asociación de BD, no cuerpo.
2. Sin asociación: 403; sin empleado para supervisor: 400. Fichaje inexistente: 404.
3. Periodo cerrado: 403 antes de persistir. Forced punch reciente: 429 antes de servicio.
4. Lote válido responde success/count; fecha cerrada al final de 51 filas rechaza
   todo antes de escrituras; lote inválido al final recibe 400.
5. Guard de rol usa BD aunque JWT conserve Admin; todas rutas protegidas sin token 401.
6. Alta sin id crea/reutiliza fila por empleado/día; integridad verifica hash sin rotura.
7. Borrar conserva soft-delete y tombstone 204; faltar fila 404, cerrada 403.
8. Resolve-anomaly valida enum y emite payload solo después de éxito.
9. Export propio ignora empleado solicitado; formatos JSON/CSV/XML/Excel contienen
   solo scope permitido, mismos headers y contenido utilizable.
10. Auto-close conserva cuerpo ignorado y success/closedCount. Límites 1/10 MiB.
