# Tareas 025: Cambio de servidor principal

Spec: [spec.md](spec.md). Plan: [plan.md](plan.md).

- [ ] T1: Completar inventario, archivos, contratos y riesgos (AC1).
- [ ] T2: Escribir BDD y demostrar RED (AC2).
- [ ] T3: Implementar aplicación y adaptadores tipados (AC3).
- [ ] T4: Verificar paridad, permisos y fallos con pruebas significativas (AC4).
- [ ] T5: Ejecutar gates y documentar resultado y rollback (AC5).

## Primera tanda y bloqueantes

- [x] A1: RED reproduce conexión anónima, sala ajena y entrega tras revocación.
- [x] A2: Implementar autenticación compartida, identidad de sala y allowlist.
- [x] A3: Revalidar colección completa en batch antes de emitir y barrido periódico.
- [x] A4: Handshake frontend vigente; conectar después del login y cerrar al salir.
- [x] A5: Gates backend/frontend, BD aislada y documentación del resultado.
- [x] B1a: Política pura por rol/empleado, proyecciones y default deny.
- [x] B1b: Invalidaciones frontend y auditoría protegida de nuevas escrituras configs.
- [x] B1c: Gates y evidencia de listener/BD reales.
- [ ] B2: Secretos en HTTP/históricos, errores y credenciales/reset destructivo.
      Tanda local validada; B2d pendiente. Gates y límites en result.md.
- [x] B2a: Máscaras SMTP y contraseña vinculada al destino.
- [x] B2b: Redacción de auditorías HTTP/export, nuevos errores y SMTP.
- [x] B2c: Reset atómico preservando administradores/hash/MFA y rollback real.
- [ ] B2d: Revocación al reset de contraseña y drenaje universal de operaciones.
- [ ] C: Cerrar deudas funcionales bloqueantes de las specs anteriores.
- [ ] D: Ensayar benchmark/rollback y retirar Express tras completar bloqueantes.
