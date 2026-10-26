# Fuentes locales y subconjuntos

Los cinco WOFF2 originales son entradas inmutables del generador. Los archivos `*-latin.woff2` conservan latín básico/español, acentos combinados, puntuación, monedas y símbolos habituales. `fonts.css` usa rangos Unicode disjuntos: caracteres adicionales cargan el original correspondiente bajo demanda. El respaldo conserva toda la cobertura anterior, incluidos alfabetos griego y cirílico.

Un texto con caracteres fuera del subconjunto puede descargar tanto el archivo latino como el original. Para el primer uso de esos caracteres sin conexión se depende de las fuentes ya cacheadas o del respaldo del sistema; los originales siguen usando la política existente de caché por primer uso y no se precargan completos.

Se mantienen anchos, contornos, hinting y todas las features OpenType. Los pesos y los alias CSS `Inter` y `Roboto Mono` son los mismos que antes. Regular se comparte entre 400/500, SemiBold entre 600/700 y Bold entre 800/900 como en la configuración original.

## Regenerar

Desde la raíz, con Node 26 y dependencias frontend instaladas:

```bash
uv venv /tmp/portal-fonts-venv
uv pip install --python /tmp/portal-fonts-venv/bin/python -r frontend/scripts/fonts/requirements.txt
fnm exec --using=26 -- /tmp/portal-fonts-venv/bin/python frontend/scripts/fonts/build_subsets.py
fnm exec --using=26 -- /tmp/portal-fonts-venv/bin/python frontend/scripts/fonts/build_subsets.py --check
npm --prefix frontend run check:font-subsets
```

Python/FontTools son herramientas de mantenimiento. El build normal utiliza los binarios versionados y valida hashes y tamaño con Node; no necesita Python. Para actualizar una fuente original, revisar su licencia, actualizar el hash explícito de entrada del generador, regenerar y repetir las pruebas visuales y de cobertura.

`font-subsets.json` registra versiones de herramientas, rangos, tamaños, caracteres y hashes. El generador valida el cmap, métricas de línea, ancho y contorno descompuesto de cada carácter del subconjunto, y conserva hinting/features de shaping.

## Licencias

Originales y derivados están bajo SIL OFL 1.1. Los derivados incluyen el texto de licencia en sus metadatos, conservan copyright y URL de licencia. También se distribuyen avisos completos desde [Inter](../../../public/fonts/LICENSE-Inter.txt) y [Roboto Mono](../../../public/fonts/LICENSE-RobotoMono.txt).

Fuentes de los avisos: [Inter](https://github.com/rsms/inter/blob/master/LICENSE.txt), [Roboto Mono](https://github.com/googlefonts/robotomono/blob/main/OFL.txt).
