## Spec

<!-- Enlace obligatorio para cambios funcionales: specs/NNNN-slug/spec.md -->

- Spec: ...
- [ ] Sigue `specs/constitution.md` (I–V)

## Verificación

- [ ] `npm run validate:ci` verde en `backend/` y `frontend/`
- [ ] `npm run spec:check` verde (si añade `specs/NNNN-*`)
- [ ] Contrato intacto: `npm run check:sdk` sin diff no committed
      (`backend/docs/swagger.json` + `frontend/src/types/api-schema.ts`)

## Decisión permanente

- [ ] No aplica, o ADR creado/actualizado en `docs/adr/`
