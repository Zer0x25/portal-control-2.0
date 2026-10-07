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
- [ ] B: Autorizar payloads/eventos por rol/empleado y resolver secretos/reset.
- [ ] C: Cerrar deudas funcionales bloqueantes de las specs anteriores.
- [ ] D: Ensayar benchmark/rollback y retirar Express tras completar bloqueantes.
