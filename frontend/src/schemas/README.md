# Schemas de formulario (spec 036)

Este directorio contiene los **schemas Zod de entrada de usuario**: las reglas
que el formulario comprueba **antes** de enviar nada al backend.

## Que NO es este directorio

| Directorio                | Que guarda                                                     | Quien lo usa                   |
| ------------------------- | -------------------------------------------------------------- | ------------------------------ |
| `src/schemas/` (**este**) | Reglas de **entrada de usuario** (lo que el formulario acepta) | `useAppForm` + los formularios |
| `src/types/schemas.ts`    | Reglas de **persistencia local** (IndexedDB)                   | La cache offline (`idb`)       |
| `src/types/api-schema.ts` | Tipos **generados** desde `backend/docs/swagger.json`          | Los servicios HTTP             |

Los tres se complementan y **no** se sustituyen:

- `src/types/api-schema.ts` es **generado**: no se edita a mano. Es la forma
  de los payloads que el backend acepta.
- `src/types/schemas.ts` protege la **cache local**: valida lo que se guarda en
  el navegador (misma forma de dato, otro proposito).
- `src/schemas/` protege el **envio**: valida lo que el usuario escribe, antes
  de que salga de la aplicacion.

Un formulario que migre a `useAppForm` **no** cambia lo que guarda la cache:
siguen siendo dos capas distintas.

## Reglas de la casa

1. **El backend es la autoridad.** Cada schema declara de que schema OpenAPI
   es copia (`backend/src/models/schemas/*.schemas.ts`). Si divergen, se
   corrige el frontend, nunca al reves.
2. **El schema del formulario es un subconjunto.** Solo estan los campos que
   el formulario escribe: los campos de auditoria (`id`, `isDeleted`,
   `syncStatus`, `lastModified`) y los que deduce el servidor
   (`authorUsername`) los pone la API.
3. **Los mensajes salen del mapa central** (`src/utils/errorMessages.ts`). El
   mismo error se dice igual en todos los formularios.
4. **Una cadena vacia no viaja.** `useAppForm` normaliza antes de validar:
   `""` se omite del payload (`undefined`) y `""` se convierte en `null` solo
   en los campos declarados `nullableFields`. Gracias a eso el schema puede
   ser una copia **exacta** del schema del backend (no necesita aceptar `""`
   en cada campo opcional).
5. **Una regla del cliente se declara, no se esconde.** Si el frontend exige
   algo que el backend no exige, va en `divergences` del mapa de contratos
   (`src/schemas/index.ts`) y, si tiene casos, en un fixture dorado.

## Divergencias declaradas

| Formulario                          | Divergencia                                                 | Por que                                                                                                                                                                        |
| ----------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `employeeForm`                      | `rut`: el frontend valida el **digito verificador**         | El backend solo exige `min(8)`. La regla es **exclusiva del cliente** y evita mandar un RUT que el backend acepta pero que no existe.                                          |
| `changePasswordForm`                | `password` obligatorio, `passwordConfirm` local             | El backend admite `password` opcional (es un `PATCH` de usuario); el formulario de cambio de contraseña lo exige, y la confirmacion nunca sale del navegador.                  |
| `mfaCodeForm`                       | `mfaToken` no lo escribe el formulario                      | El backend lo deduce de la sesion (el modal solo escribe el codigo de 6 digitos).                                                                                              |
| `mfaSetupForm`                      | `token` de exactamente 6 digitos                            | El backend pide 1+ caracteres (el TOTP lo valida el servidor); el formulario exige el codigo de la app de autenticacion.                                                       |
| `correctionRequestForm`             | `requestedValue` en `YYYY-MM-DDTHH:mm`                      | El formulario captura la **hora de Chile**; el controller la convierte a ISO-8601 con offset antes de enviar.                                                                  |
| `correctionRequestForm`             | el modal solo escribe el valor y el motivo                  | El empleado, el marcaje, el campo y el valor actual los aporta la pantalla que lo abre; el adjunto es un `File` que se convierte a base64 al enviar.                           |
| `shiftPatternForm`                  | `dailySchedules` siempre como array                         | El backend admite tambien un string serializado; el formulario envia la estructura, que es la unica validable.                                                                 |
| `quickNoteForm`, `meterReadingForm` | `authorUsername` no lo escribe el formulario                | El backend lo deduce de la sesion.                                                                                                                                             |
| `smtpProfileBaseForm`               | `fromEmail` puede ir vacio                                  | El backend lo admite mientras el perfil no sea el activo (regla condicional que el OpenAPI no expresa).                                                                        |
| `smtpProfileForm`                   | host, usuario, contrasena, nombre y remitente con contenido | El backend admite la cadena vacia en esos campos (los `required` del `<input>` los exigian antes); el formulario los exige siempre.                                            |
| `employeeForm`                      | `position` obligatorio                                      | El backend lo admite opcional; el formulario de alta/edicion lo exige.                                                                                                         |
| `employeeForm`                      | `area` y `workdayType` sin declarar en el OpenAPI           | El backend **los acepta y los guarda** (`EmployeeService` los escribe), pero su schema Zod no los declara: es un hueco de documentacion del contrato, no una perdida de datos. |
| `userForm`                          | `password` obligatoria en el alta                           | El formulario no muestra un campo de contraseña (muestra la temporal que asigna el backend), asi que la regla se declara como divergencia.                                     |
| `singleMeterReadingForm`            | `value` es el texto que teclea el usuario                   | El hook `useMeterReadings` lo convierte a numero antes de enviarlo: es un campo **transformado** (el texto puede llevar el prefijo `+` de recarga).                            |
| `rejectionReasonForm`               | `rejectionReason` obligatorio                               | El backend lo exige solo cuando el estado es `rejected` (regla condicional que el OpenAPI no expresa); este formulario **siempre** rechaza, asi que lo exige siempre.          |
| `seedingOptionsForm`                | los siete valores, siempre enviados                         | El backend los admite opcionales y aplica sus propios valores por defecto; el formulario siempre los envia.                                                                    |
| `seedingOptionsForm`                | `employees` y `days` con minimo 1                           | El backend admite 0: una simulacion sin empleados ni dias no simula nada.                                                                                                      |
| `seedingOptionsForm`                | maximos propios de la pantalla                              | `employees` (3000), `days` (7300), `basePatternsCount` (12) y `quickNotesCount` (2000) son limites de la pantalla: el backend no los acota.                                    |
| `sendTestEmailForm`                 | `subject` y `message` obligatorios                          | El backend los admite vacios (los pone por defecto); el formulario del centro de correo los exige.                                                                             |

### Como se declara cada tipo de divergencia

El mapa de contratos (`src/schemas/index.ts`) tiene una lista por tipo, para
que el test de paridad sepa que descartar y que la razon quede escrita:

| Lista                     | Significado                                                               | Ejemplo                                         |
| ------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------- |
| `localFields`             | El campo **solo** existe en el formulario: no viaja al backend.           | `passwordConfirm` del cambio de contraseña.     |
| `openApiUndeclaredFields` | El campo **viaja y el backend lo guarda**, pero su OpenAPI no lo declara. | `area`/`workdayType` del empleado.              |
| `transformedFields`       | El valor se **transforma** antes de enviarlo (cambia de tipo o formato).  | `requestedValue` de la solicitud de corrección. |

Un campo declarado como `transformedFields` tambien puede **cambiar de tipo**
(la lectura de un medidor es un texto en el formulario y un numero en la API):
el comparador de paridad salta la comprobacion de tipo de esos campos (igual
que ya hacia con el formato y el patron).

| Lista              | Significado                                                                | Ejemplo                                |
| ------------------ | -------------------------------------------------------------------------- | -------------------------------------- |
| `stricterRequired` | El formulario **exige** un campo que el backend admite opcional.           | `position` del empleado.               |
| `stricterMaximum`  | El formulario acota el **maximo** mas que el backend (limite de pantalla). | `employees` de la simulacion de datos. |
| `divergences`      | Reglas del cliente que el backend no implementa.                           | El digito verificador del RUT.         |

## Como se verifica la paridad

Dos tests, complementarios:

1. **`src/tests/contracts/form-schema-parity.test.ts`** compara, atributo a
   atributo, el JSON Schema que genera Zod (`z.toJSONSchema`) con el
   artefacto OpenAPI del backend (`backend/docs/swagger.json`): `required`,
   `minLength`, `maxLength`, `pattern`, `enum`, `minimum`, `maximum`,
   `format` y `nullable`. Falla si el formulario se salta una constraint del
   backend, si se inventa una, o si escribe un campo que la API no conoce.

2. **`src/tests/contracts/form-schema-fixtures.test.ts`** ejecuta los
   **fixtures dorados** (`src/tests/contracts/cases/*.json`): el registro
   dorado de las reglas que OpenAPI no puede expresar (los `.refine()` del
   backend). Si el backend cambia una de esas reglas, el fixture falla y
   obliga a revisar el schema y el fixture a la vez.

```bash
cd frontend
npx vitest run --project jsdom src/tests/contracts
```

## Formularios locales (sin contraparte en el backend)

`localSupplierForm`, `localNoveltyForm` y `localMeterConfigForm` no mutan la
API: son datos del navegador. No tienen schema OpenAPI con el que verificar la
paridad, asi que el test los ignora a proposito (estan listados en
`LOCAL_ONLY_FORM_SCHEMA_IDS`).

Sus campos se corrigieron en la spec 036 T10: describian un formulario que la
pantalla nunca mostro (el proveedor con nombre, RUT y telefono; la novedad con
tipo, hora de inicio y justificacion). Ahora describen el formulario real (la
patente, el conductor, los pasajeros, la empresa, el motivo y la hora; la
anotacion y su hora), que es el que valida `useAppForm`.
