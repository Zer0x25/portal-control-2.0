# Tareas 002: Endurecimiento del runtime HTTP y secretos

Spec: `./spec.md`. Plan: `./plan.md`. Estado: Implementado.

- [x] T1: tests que reproduzcan H-01/H-02 (origen arbitrario, body > 1mb)
- [x] T2: CORS allowlist + tests verdes (AC1)
- [x] T3: body-limit por ruta + tests verdes (AC2, con desvío documentado:
      global 1mb + pre-parser 10mb en 6 bulk + multer 50mb; import es
      multipart, no JSON)
- [x] T4: throttle admin propio 1000/15min (AC3)
- [x] T5: seed fail-fast + logs sin hash (AC4, AC5)
- [x] T6: auditoría primer login + fix ambos extremos (AC6)
- [x] T7: `npm run validate:ci` backend + frontend verdes
- [x] T8: ADR-0011 + `README.md` §2 actualizados
