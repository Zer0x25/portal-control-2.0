# Pipeline de tokens

`frontend/tokens.json` es la fuente de verdad de los tokens de color que
Tailwind expone en `src/index.css`. Cada entrada conserva las dos claves del
contrato:

- `token`: nombre público usado por las clases (`token-accent-brand`).
- `cssVar`: variable CSS subyacente (`--accent-professional`). No se infiere
  del nombre público: `token-text-onAccent`, por ejemplo, usa
  `--text-on-accent`.
- `light` y `dark`: valores CSS por tema. `dark: null` requiere
  `lightOnly: true`; hoy aplica a `--status-success`, `--status-warning` y
  `--status-info`, que conservan su valor de claro en modo oscuro.
- `protectedScale`: marca miembros de las escalas contractuales de estados y
  data-viz. El ratchet puede reportar un miembro sin consumidor estático, pero
  no permite retirar solo ese miembro.

Las secciones `themeSections`, `lightSections` y `darkSections` fijan el orden
de salida y mantienen los grupos legibles. Los comentarios por entrada
preservan las notas junto a una variable.

## Uso

```bash
npm run tokens:build   # Regenera index.css y src/types/tokens.ts
npm run tokens:check   # Falla si alguno difiere de tokens.json
npm run audit:design-system
```

El `validate:ci` del frontend ejecuta `tokens:check` y el audit. Para editar un
token se cambia `tokens.json` y se regenera; no se editan a mano las regiones
delimitadas por `@tokens:theme` y `@tokens:vars` en `index.css`.

Figma no es una fuente automática ni obligatoria. Tokens Studio u otro
productor puede escribir `tokens.json` si respeta la versión y el contrato
`token`/`cssVar`, los valores por tema y las secciones. La integración con
Figma queda como paso posterior.

## Huérfanos reservados

El baseline medido contiene cinco tokens sin consumidor literal fuera del
catálogo, las stories y los tests:

- `token-chart-1`, `token-chart-3` y `token-chart-8`, miembros de la escala
  contractual completa `chart-1..8`.
- `token-status-info-surface` y `token-status-info-text`, miembros de la
  escala genérica `success|warning|error|info × surface|text`.

Se mantienen como miembros reservados de escalas activas; el ratchet inicial
es 5 y solo puede decrecer. Las clases interpoladas del catálogo
(`bg-token-chart-${index}` y las clases con `token-status-${tone}`) se
informan aparte porque Tailwind v4 no puede generar nombres construidos en
runtime. El scorecard estático no las cuenta como consumidores reales.
