# Changelog

## [8.37.3](https://github.com/Zer0x25/portal-control-2.0/compare/v8.37.2...v8.37.3) (2026-10-26)


### Bug Fixes

* **cd:** isolate release e2e fixtures ([#137](https://github.com/Zer0x25/portal-control-2.0/issues/137)) ([4331bdc](https://github.com/Zer0x25/portal-control-2.0/commit/4331bdccb9107894b98ec1767cb53108e31ef0bd))

## [8.37.2](https://github.com/Zer0x25/portal-control-2.0/compare/v8.37.1...v8.37.2) (2026-10-26)


### Bug Fixes

* **cd:** stabilize release gate and parallelize image builds ([#135](https://github.com/Zer0x25/portal-control-2.0/issues/135)) ([8281812](https://github.com/Zer0x25/portal-control-2.0/commit/828181270e7469726596afc98fa13b9a90f18f41))

## [8.37.1](https://github.com/Zer0x25/portal-control-2.0/compare/v8.37.0...v8.37.1) (2026-10-26)


### Bug Fixes

* **ci:** grant Release Please actions read permission ([#133](https://github.com/Zer0x25/portal-control-2.0/issues/133)) ([432aedc](https://github.com/Zer0x25/portal-control-2.0/commit/432aedcedde8cced73bbad48d18ca260485baf25))

## [8.37.0](https://github.com/Zer0x25/portal-control-2.0/compare/v8.36.1...v8.37.0) (2026-10-26)


### Features

* **ui:** Add ARIA labels to icon-only buttons in Logbook ([#129](https://github.com/Zer0x25/portal-control-2.0/issues/129)) ([8844a50](https://github.com/Zer0x25/portal-control-2.0/commit/8844a5045fb7cc936e3b9c518df3f28625153487))
* **ui:** improve tooltip and loading overlay accessibility ([#128](https://github.com/Zer0x25/portal-control-2.0/issues/128)) ([62130c8](https://github.com/Zer0x25/portal-control-2.0/commit/62130c8745ff3aaa1cf728e6a7dcf9119d41c52b))
* **ui:** standardize list typography ([5093d4c](https://github.com/Zer0x25/portal-control-2.0/commit/5093d4c880b9484ec28e03ff2f5adefbe959d8a9))


### Bug Fixes

* **auth:** preserve login styling in performance mode ([3062f9b](https://github.com/Zer0x25/portal-control-2.0/commit/3062f9b367259882b55e54d5fbd5608ed95af34b))
* **frontend:** satisfy responsive and query test gates ([bf05e59](https://github.com/Zer0x25/portal-control-2.0/commit/bf05e59d09278fb16977ea5f5b351a22ea339a95))
* **frontend:** scope bootstrap handoff to app builds ([8eec1f5](https://github.com/Zer0x25/portal-control-2.0/commit/8eec1f5bdf01119a6799f47223e9966772893dcf))
* **perf:** require current readiness endpoint ([9e6c151](https://github.com/Zer0x25/portal-control-2.0/commit/9e6c151b9b5a727b6bfe1b71d6f1a8cf59ffbf64))
* **ui:** align clocking action colors ([ff0f521](https://github.com/Zer0x25/portal-control-2.0/commit/ff0f521ebc7a1cbb4b7db2d1a1588b209d4b0eba))
* **ui:** align worker portal surfaces with design system ([280d394](https://github.com/Zer0x25/portal-control-2.0/commit/280d39488bc4851203b995e6eb7b4f1413db9dab))
* **ui:** improve worker portal readability ([ce96bd2](https://github.com/Zer0x25/portal-control-2.0/commit/ce96bd263cd1790e8609c19c93d9609c6d888294))
* **ui:** preserve ambient glows in performance mode ([081e8fb](https://github.com/Zer0x25/portal-control-2.0/commit/081e8fbc93f108fa5ffbf2c7e9f2e1b9c8af9288))
* **ui:** remove ambient glows from worker and about views ([9bebf0b](https://github.com/Zer0x25/portal-control-2.0/commit/9bebf0b46df9af62a95d67bd08070da48e133862))
* **ui:** remove italic time control timestamps ([bc58b13](https://github.com/Zer0x25/portal-control-2.0/commit/bc58b133d94f302e3b9bc7bb2c937479202dee5f))


### Performance Improvements

* **app:** narrow shell auth subscription ([2421fc6](https://github.com/Zer0x25/portal-control-2.0/commit/2421fc684fab0c8ae67cde49420c12be51da06d2))
* **employees:** skip unused count for full lists ([71026a5](https://github.com/Zer0x25/portal-control-2.0/commit/71026a5197022ae283c523538ba58a1d8a058656))
* **frontend:** add measured Dashboard bootstrap shell ([20a30b8](https://github.com/Zer0x25/portal-control-2.0/commit/20a30b8cbb957b2026aca36d7f6698ef73b2f88f))
* **frontend:** add route baselines and optimize dashboard startup ([ce53d58](https://github.com/Zer0x25/portal-control-2.0/commit/ce53d585b56dd696aa46840d0c63eed73c56cb1f))
* **frontend:** defer ambient notes query ([b49d691](https://github.com/Zer0x25/portal-control-2.0/commit/b49d6915e58f44928a5a0dabed595b8d4a1599ca))
* **frontend:** defer Dashboard CSS and expand cold route metrics ([0ab420f](https://github.com/Zer0x25/portal-control-2.0/commit/0ab420f233817e3246f1735d8a6e707bfacb6715))
* **frontend:** defer timezone helpers from dashboard startup ([e3fea81](https://github.com/Zer0x25/portal-control-2.0/commit/e3fea8191a3aefafa1da969e79b14ca8a4969998))
* **frontend:** gate automatic scheduling queries by eligibility ([d9d41e7](https://github.com/Zer0x25/portal-control-2.0/commit/d9d41e756724ef426f80b0eb3ac59d6b079b2309))
* **frontend:** lazy-load eligible auto-start logic ([546d870](https://github.com/Zer0x25/portal-control-2.0/commit/546d870324cb1c8aae8417cb7b0a0d5ea896c077))
* **frontend:** reduce auth store subscriptions ([ef42e40](https://github.com/Zer0x25/portal-control-2.0/commit/ef42e40812a7321d53ab046dfd3adda9cdbd1f11))
* **frontend:** remove redundant dashboard policy request ([3db6278](https://github.com/Zer0x25/portal-control-2.0/commit/3db6278c7d8722c57e5cab5e19ffc32edea4b4c7))
* **frontend:** render dashboard welcome during loading ([f1d515b](https://github.com/Zer0x25/portal-control-2.0/commit/f1d515b9bfbc4567c48ca096aa5aecce3511f0a1))
* **frontend:** render time-control bootstrap shell ([f6d8ff2](https://github.com/Zer0x25/portal-control-2.0/commit/f6d8ff259b06c46abd0a7e1fa7b08888afcec478))
* **frontend:** share startup health query safely ([3a08b12](https://github.com/Zer0x25/portal-control-2.0/commit/3a08b122425a41320d5b1de9ebec4ce4bc1e74d6))
* **kpi:** yield between cached schedule batches ([#127](https://github.com/Zer0x25/portal-control-2.0/issues/127)) ([1fa82af](https://github.com/Zer0x25/portal-control-2.0/commit/1fa82afc8258e2b56fa6cab7af87d67c1239ee84))
* **scheduling:** stabilize daily schedule lookup ([5e3ff76](https://github.com/Zer0x25/portal-control-2.0/commit/5e3ff76e9445e09ac102bbcdf1ac8611e5496f32))
* **startup:** use lightweight readiness query ([e85708c](https://github.com/Zer0x25/portal-control-2.0/commit/e85708c2c5c5195acd0abe371e33e73a1b795aab))
* **time-control:** defer clock status query ([8eca6c1](https://github.com/Zer0x25/portal-control-2.0/commit/8eca6c107db766d92c72a51f6b713c9b467d3cd7))
* **time-control:** defer edit timestamp modal ([5829f10](https://github.com/Zer0x25/portal-control-2.0/commit/5829f1049bea999c9001a93932c6f97365aa566c))
* **time-control:** defer user directory lookup ([7a809ef](https://github.com/Zer0x25/portal-control-2.0/commit/7a809eff90c59c2acf5088bf29815379d085f826))
* **time-control:** defer virtualized table until visible ([c6f0699](https://github.com/Zer0x25/portal-control-2.0/commit/c6f069955baa065c8ea7e0d8b50a4361657a63cc))
* **time-control:** diagnose and reduce startup work ([#131](https://github.com/Zer0x25/portal-control-2.0/issues/131)) ([97c3053](https://github.com/Zer0x25/portal-control-2.0/commit/97c3053e7d4c95aa8c4a49f6a0112dc82474c3d8))
* **time-control:** record sync overlay LCP experiment ([b55b0c0](https://github.com/Zer0x25/portal-control-2.0/commit/b55b0c07ce2d7af73fc228933d874a6d31d0fcbd))
* **time-control:** render page shell while records load ([3b24d35](https://github.com/Zer0x25/portal-control-2.0/commit/3b24d35fe72819210836694e06fd4d3660d77135))
* **time-control:** skip cache check without sync marker ([ab77e14](https://github.com/Zer0x25/portal-control-2.0/commit/ab77e14db1b3a5d0a4c0805b4dfd6351ee03e16b))
* **time-control:** use minimal employee clocking options ([723c4ba](https://github.com/Zer0x25/portal-control-2.0/commit/723c4baecd860e096635a8744fa18055184a8036))
* **worker-portal:** add production CPU attribution ([6936a2f](https://github.com/Zer0x25/portal-control-2.0/commit/6936a2fd54fad6959c51721516e55f523512eeaa))
* **worker-portal:** defer correction modal bundle ([ec56eb4](https://github.com/Zer0x25/portal-control-2.0/commit/ec56eb43c0eb510c86963a8fab4887b2b37f46c9))
* **worker-portal:** paint bootstrap shell before React ([8a23028](https://github.com/Zer0x25/portal-control-2.0/commit/8a23028930cb7ff8ee75ff2a9006e2d92d68c0ee))
* **worker-portal:** remove derived state renders ([5bf9943](https://github.com/Zer0x25/portal-control-2.0/commit/5bf9943ccc869566b935775533db1428fc141807))
* **worker-portal:** reuse month date formatter ([db51a6e](https://github.com/Zer0x25/portal-control-2.0/commit/db51a6ed23a6284df3de47a09adcf2caf80e728a))

## [8.36.1](https://github.com/Zer0x25/portal-control-2.0/compare/v8.36.0...v8.36.1) (2026-10-23)


### Bug Fixes

* **frontend:** pinta las filas del visor de auditoría con React Compiler ([#125](https://github.com/Zer0x25/portal-control-2.0/issues/125)) ([a6207e1](https://github.com/Zer0x25/portal-control-2.0/commit/a6207e1b15db36ca178883853a0e5510df495738))

## [8.36.0](https://github.com/Zer0x25/portal-control-2.0/compare/v8.35.0...v8.36.0) (2026-10-23)


### Features

* **frontend:** add design system catalog and token pipeline ([#123](https://github.com/Zer0x25/portal-control-2.0/issues/123)) ([a0b6f88](https://github.com/Zer0x25/portal-control-2.0/commit/a0b6f8833742a3a3dbf1d304785781590671551d))
* **frontend:** implement spec 037 rendering observability ([#121](https://github.com/Zer0x25/portal-control-2.0/issues/121)) ([376f293](https://github.com/Zer0x25/portal-control-2.0/commit/376f2931dba2522fc07fb6931d35ccbc98af4e06))

## [8.35.0](https://github.com/Zer0x25/portal-control-2.0/compare/v8.34.0...v8.35.0) (2026-10-22)


### Features

* **frontend:** primitiva DataTable headless sobre TanStack Table (spec 036 T14, T17) ([#115](https://github.com/Zer0x25/portal-control-2.0/issues/115)) ([a55fee4](https://github.com/Zer0x25/portal-control-2.0/commit/a55fee4d5eed3a7f2d085193c1aa237024998736))

## [8.34.0](https://github.com/Zer0x25/portal-control-2.0/compare/v8.33.0...v8.34.0) (2026-10-22)


### Features

* **frontend:** capa de formulario y a11y de error (spec 036 T1-T4) ([#98](https://github.com/Zer0x25/portal-control-2.0/issues/98)) ([14eebc9](https://github.com/Zer0x25/portal-control-2.0/commit/14eebc9270ad5f50fd842f7564cd7e60d1c797dd))
* **frontend:** migra el inicio de sesion a useAppForm (spec 036 T12a) ([#110](https://github.com/Zer0x25/portal-control-2.0/issues/110)) ([30c7628](https://github.com/Zer0x25/portal-control-2.0/commit/30c762836fb1df5f3baf322dee7397f8d2817c3a))
* **frontend:** migra la simulacion y el correo de prueba a useAppForm (spec 036 T10b) ([#106](https://github.com/Zer0x25/portal-control-2.0/issues/106)) ([38f8319](https://github.com/Zer0x25/portal-control-2.0/commit/38f83194be61f0937ca6e4a4bd0b51d7bba578bf))
* **frontend:** migra la solicitud de correccion y la nota rapida a useAppForm (spec 036 T11b) ([#109](https://github.com/Zer0x25/portal-control-2.0/issues/109)) ([28e8bcd](https://github.com/Zer0x25/portal-control-2.0/commit/28e8bcd7bb7fcd66064e7ff355d1ca94f30c8415))
* **frontend:** migra los formularios de auth a useAppForm (spec 036 T11a) ([#108](https://github.com/Zer0x25/portal-control-2.0/issues/108)) ([82ec240](https://github.com/Zer0x25/portal-control-2.0/commit/82ec240b1846f9a1f915206c990a49e49bc25063))
* **frontend:** migra los formularios de empleado y usuario a useAppForm (spec 036 T9a) ([#103](https://github.com/Zer0x25/portal-control-2.0/issues/103)) ([b91c411](https://github.com/Zer0x25/portal-control-2.0/commit/b91c411f6826e59b04d998ced90622fbf4e0440f))
* **frontend:** migra los formularios de libreta y rechazo a useAppForm (spec 036 T10a) ([#105](https://github.com/Zer0x25/portal-control-2.0/issues/105)) ([64d3800](https://github.com/Zer0x25/portal-control-2.0/commit/64d380089bf071430472cefaae3213628ca33d6a))
* **frontend:** migra los formularios de turnos teoricos a useAppForm (spec 036 T8) ([81e6c18](https://github.com/Zer0x25/portal-control-2.0/commit/81e6c188940d3f0cb10106173b6b9301fc28491b))
* **frontend:** migra los perfiles SMTP a useAppForm (spec 036 T10c) ([#107](https://github.com/Zer0x25/portal-control-2.0/issues/107)) ([e0e027c](https://github.com/Zer0x25/portal-control-2.0/commit/e0e027cb2e05a0429f3ad86d12bededebef3b0ac))
* **frontend:** migra los tres formularios de medidores a useAppForm (spec 036 T9b) ([#104](https://github.com/Zer0x25/portal-control-2.0/issues/104)) ([c9ae87e](https://github.com/Zer0x25/portal-control-2.0/commit/c9ae87e9eb1051c5e2659003f547cb21d4e42da5))
* **frontend:** migra SystemMaintenance a useAppForm (spec 036 T12b) ([#112](https://github.com/Zer0x25/portal-control-2.0/issues/112)) ([393f924](https://github.com/Zer0x25/portal-control-2.0/commit/393f92491ec3f9a24395a02abd07d3fed433a47e))
* **frontend:** saca el borrador de hora del store en EditTimestampModal (spec 036 T12c) ([#113](https://github.com/Zer0x25/portal-control-2.0/issues/113)) ([4656546](https://github.com/Zer0x25/portal-control-2.0/commit/46565462c6c7ad719ea95056a4bc01f3308a9b15))
* **frontend:** schemas de formulario con paridad verificada (spec 036 T5-T7) ([#101](https://github.com/Zer0x25/portal-control-2.0/issues/101)) ([85c2c43](https://github.com/Zer0x25/portal-control-2.0/commit/85c2c433c3e7869e9d4d72a26a5c0116f01e1f3f))

## [8.33.0](https://github.com/Zer0x25/portal-control-2.0/compare/v8.32.0...v8.33.0) (2026-10-22)


### Features

* **release:** accumulated changes since v8.32.0 (033-035 hardening, holiday enum, perf, a11y) ([7c5da19](https://github.com/Zer0x25/portal-control-2.0/commit/7c5da19f49ccfc315bc8c2abfa2fc9cc2323b12d))

## [8.32.0](https://github.com/Zer0x25/portal-control-2.0/compare/v8.31.3...v8.32.0) (2026-10-22)


### Features

* **frontend:** blinda la frontera de capas del frontend (spec 033 Fase A) ([9d93e02](https://github.com/Zer0x25/portal-control-2.0/commit/9d93e02f688c259af68afc0c019f21713320a8a8))
* **frontend:** blinda la frontera de capas del frontend (spec 033 Fase A) ([304c960](https://github.com/Zer0x25/portal-control-2.0/commit/304c96087f089a45888d24d30867c3f5e0156c58))
* **frontend:** consolida el cliente HTTP y corrige los 3 P0 de cache (spec 034) ([96bd954](https://github.com/Zer0x25/portal-control-2.0/commit/96bd9548a5fa23cbfa8a69eb6dff35b783ab96f7))
* **frontend:** consolida el cliente HTTP y la politica de red (spec 034 Fase A) ([811f52e](https://github.com/Zer0x25/portal-control-2.0/commit/811f52ea02830a04312d588cc0f50f5fcb5ff001))
* **frontend:** migra authService al cliente unico (spec 034 T14) ([5515069](https://github.com/Zer0x25/portal-control-2.0/commit/5515069b50ff61cd01425fc3f0580a8403753822))
* **frontend:** migra los lotes 1 y 2 de services a apiClient (spec 034 T9-T10) ([09adb30](https://github.com/Zer0x25/portal-control-2.0/commit/09adb3053b00ab9bc9ef200d76c4b0666c051e59))
* **frontend:** migra los lotes 3 y 4 de services y los hooks de governance (spec 034 T11-T13) ([e370fd2](https://github.com/Zer0x25/portal-control-2.0/commit/e370fd2b994ac58d90b2243986e77868f9e3daf0))
* **frontend:** tabla canonica de claves de query y correccion de los 3 P0 (spec 034 T17-T25) ([0b286ae](https://github.com/Zer0x25/portal-control-2.0/commit/0b286ae0cc40275b86e1c33a98f5c8df92dbd3b0))
* **ui:** add aria-label to sidebar theme and about buttons ([e15a815](https://github.com/Zer0x25/portal-control-2.0/commit/e15a8153d0de56579a39a0848770b0377fb2406a))
* **ui:** add aria-labels to sidebar icon buttons ([6562fbe](https://github.com/Zer0x25/portal-control-2.0/commit/6562fbe41a7c50f508625a67a2d33a2e41c84894))


### Bug Fixes

* **backend:** alinea enum de tipo de feriado con el frontend (Nacional/Regional/Especifico) ([5158bdf](https://github.com/Zer0x25/portal-control-2.0/commit/5158bdffddde454ec95ffef0f52f6200c2018cdb))


### Performance Improvements

* **core:** chunk record enrichment to prevent event loop blocking ([cfd091f](https://github.com/Zer0x25/portal-control-2.0/commit/cfd091fb0858f86ab9b821ef1bd0b92d139a40d3))
* **core:** chunk record enrichment to prevent event loop blocking ([386b450](https://github.com/Zer0x25/portal-control-2.0/commit/386b450bf947d3882ea532ff064f7320661b5d8f))

## [8.31.3](https://github.com/Zer0x25/portal-control-2.0/compare/v8.31.2...v8.31.3) (2026-10-21)


### Bug Fixes

* corrige hallazgos de la auditoria staging v8.31.2 (kiosco RUT + a11y) ([#83](https://github.com/Zer0x25/portal-control-2.0/issues/83)) ([376bd6d](https://github.com/Zer0x25/portal-control-2.0/commit/376bd6d17f698a8acf818f06accaecd8ac2ac6b9))

## [8.31.2](https://github.com/Zer0x25/portal-control-2.0/compare/v8.31.1...v8.31.2) (2026-10-21)


### Bug Fixes

* **frontend:** absorbe hardenings de drafts de agentes (dompurify + aria-label) ([#80](https://github.com/Zer0x25/portal-control-2.0/issues/80)) ([523bb4d](https://github.com/Zer0x25/portal-control-2.0/commit/523bb4d66e6f9e4fc8b44d94014968f93b589505))

## [8.31.1](https://github.com/Zer0x25/portal-control-2.0/compare/v8.31.0...v8.31.1) (2026-10-21)


### Bug Fixes

* **deploy:** hereda .npmrc en el build de imagen de frontend ([#78](https://github.com/Zer0x25/portal-control-2.0/issues/78)) ([55b41df](https://github.com/Zer0x25/portal-control-2.0/commit/55b41df9cce3bf949acabbc92c19a74e5da69e57))

## [8.31.0](https://github.com/Zer0x25/portal-control-2.0/compare/v8.30.0...v8.31.0) (2026-10-21)


### Features

* **ui:** consolida superficie UI y estado remoto con cache offline (specs 031-032) ([#76](https://github.com/Zer0x25/portal-control-2.0/issues/76)) ([d233fec](https://github.com/Zer0x25/portal-control-2.0/commit/d233fecded3f488c0d63801b42f85ab3a4d2f6c5))

## [8.30.0](https://github.com/Zer0x25/portal-control-2.0/compare/v8.29.1...v8.30.0) (2026-10-14)


### Features

* Palette: [UX improvement] Add ARIA labels to icon-only buttons ([#54](https://github.com/Zer0x25/portal-control-2.0/issues/54)) ([cc88ad2](https://github.com/Zer0x25/portal-control-2.0/commit/cc88ad24591e6ba58ba6a1272b0c9b920fc7db55))


### Bug Fixes

* **auth:** enforce JWT_SECRET via getter without weak fallback ([367e578](https://github.com/Zer0x25/portal-control-2.0/commit/367e578e81c978c0fb9e0b2f7d1d2b9f25875ed0))
* **db:** replace executeRawUnsafe with executeRaw in maintenanceService ([e4990c8](https://github.com/Zer0x25/portal-control-2.0/commit/e4990c885c7cffa9b78ca87b94ed6f66b5d33370))


### Performance Improvements

* **kpi:** parallelize missing marks schedule lookup ([a6b3ce0](https://github.com/Zer0x25/portal-control-2.0/commit/a6b3ce07a31c90d70c59f96ea23623b61e990979))
* **kpi:** parallelize schedule lookups in kpi stats ([b0c1db5](https://github.com/Zer0x25/portal-control-2.0/commit/b0c1db5c5f50e01b65553773f426c0547ccb79c1))

## [8.29.1](https://github.com/Zer0x25/portal-control-2.0/compare/v8.29.0...v8.29.1) (2026-10-14)


### Bug Fixes

* **db:** sanitize pool connection urls and harden maintenance routines ([#63](https://github.com/Zer0x25/portal-control-2.0/issues/63)) ([7aaf0da](https://github.com/Zer0x25/portal-control-2.0/commit/7aaf0daccf2750039d14c562769a32e207ab8aba))
* **operations:** harden holiday sync, shift report mutations, and scheduling batch fetch ([#64](https://github.com/Zer0x25/portal-control-2.0/issues/64)) ([1c6a408](https://github.com/Zer0x25/portal-control-2.0/commit/1c6a40826c9f0a3aae574923ca7cbd595b3c4378))
* **security:** harden runtime coordination, kiosk auth and audit trigger ([#61](https://github.com/Zer0x25/portal-control-2.0/issues/61)) ([670a99b](https://github.com/Zer0x25/portal-control-2.0/commit/670a99b94b18684686bdbe730472bf91d1eb7b2f))

## [8.29.0](https://github.com/Zer0x25/portal-control-2.0/compare/v8.28.0...v8.29.0) (2026-10-11)


### Features

* **frontend:** agent navigation contract with tab roles, login testids and orphan sidebar routes ([147fe0e](https://github.com/Zer0x25/portal-control-2.0/commit/147fe0e7a4981d54a2b22791531c4a79fa75a316))
* **frontend:** agent testids for pagination, modal dialog and MFA flows ([c360f86](https://github.com/Zer0x25/portal-control-2.0/commit/c360f860852d451264be5a8809376cbb83a82870))
* **frontend:** Beta badge on sidebar items for modules under construction ([7c825c5](https://github.com/Zer0x25/portal-control-2.0/commit/7c825c579125d840cef9e99d750e90899e7246d9))
* **frontend:** content and kiosk testid contract for pages, tables and keypad ([07e68f7](https://github.com/Zer0x25/portal-control-2.0/commit/07e68f78197be537e338b95ae778d428dc967135))


### Bug Fixes

* **frontend:** 404 page with shell context and access-denied toast on role redirect ([804c849](https://github.com/Zer0x25/portal-control-2.0/commit/804c849a5c6bc2c9b1d37782ff2f9fb34015484b))
* **frontend:** accessible names for all form fields via label fallback and aria-labels ([704f6d9](https://github.com/Zer0x25/portal-control-2.0/commit/704f6d95897d3d4566240f8afe0bf6f634441308))
* **frontend:** accessible names for icon-only buttons via title fallback and aria-labels ([b1f8b21](https://github.com/Zer0x25/portal-control-2.0/commit/b1f8b21e78fb2ffaa441bbcb43b9ccd25fd2f9f0))
* **frontend:** bound expected-empty public config fetches to once per session ([aec2b60](https://github.com/Zer0x25/portal-control-2.0/commit/aec2b6015f4b2abdba75055320617fb2efad1806))
* **frontend:** header brand uses p instead of h1 for single-h1 pages ([f78271a](https://github.com/Zer0x25/portal-control-2.0/commit/f78271a1609f19b9fa05a5d0d5cb6ae0ccbc67a9))
* **frontend:** omit empty meter filters to avoid 400 on GET /api/meters ([85917b1](https://github.com/Zer0x25/portal-control-2.0/commit/85917b1c6d072f8f950009b6f7f2f6687732c179))
* **security:** migrate cryptoUtils to authenticated AES-256-GCM ([#48](https://github.com/Zer0x25/portal-control-2.0/issues/48)) ([9570c1c](https://github.com/Zer0x25/portal-control-2.0/commit/9570c1cadecac12eb197b6bb4fbd702c15c16297))

## [8.28.0](https://github.com/Zer0x25/portal-control-2.0/compare/v8.27.1...v8.28.0) (2026-10-11)


### Features

* Palette: [UX improvement] Add ARIA labels and titles to DatePicker icon buttons ([#43](https://github.com/Zer0x25/portal-control-2.0/issues/43)) ([ead0162](https://github.com/Zer0x25/portal-control-2.0/commit/ead0162a86b3701246e7727fcfb42093a2611341))


### Bug Fixes

* **ci:** enforce no-emoji rule on PR titles and all Jules prompts ([cd04031](https://github.com/Zer0x25/portal-control-2.0/commit/cd0403130ecc8f46090740ba10325c9087a0d1c2))
* **kiosk:** forward geolocation to punch, toast on failure with regression tests ([3bf19c9](https://github.com/Zer0x25/portal-control-2.0/commit/3bf19c9699388c9d39aab6353d8b4aef1794cb22))
* **kiosk:** surface leave denial, future-proof corrections, empty users state ([d147043](https://github.com/Zer0x25/portal-control-2.0/commit/d1470430ab4f6ca504e8bed90140058ecfe8104c))
* **records:** accept camelCase punch forcedType with snake legacy fallback ([cd5bb05](https://github.com/Zer0x25/portal-control-2.0/commit/cd5bb053830c59d20ff1f6e693967877e8ad52fb))
* **records:** block punch on active leave, reject future dates, open users read to supervisors ([8ec8717](https://github.com/Zer0x25/portal-control-2.0/commit/8ec8717d5894f30873c89cf867b4003e27785482))
* **worker-portal:** harden loading, month filter, status and punch contract with regression tests ([ffe9c50](https://github.com/Zer0x25/portal-control-2.0/commit/ffe9c5087c0b7d69eafdbddac5fb70b4758e665a))
* **worker-portal:** single punch error toast and double-submit guard ([f43b0c3](https://github.com/Zer0x25/portal-control-2.0/commit/f43b0c37d33c2df2e3df30160fcc4f353b3d437e))


### Performance Improvements

* Bolt: memoize kpiMetrics array in useKpisLogic ([#42](https://github.com/Zer0x25/portal-control-2.0/issues/42)) ([cd48c29](https://github.com/Zer0x25/portal-control-2.0/commit/cd48c2979911d328f002e4e1e6c58656e7db0a1a))
* Bolt: optimize employee list filtering ([#50](https://github.com/Zer0x25/portal-control-2.0/issues/50)) ([f8e2c12](https://github.com/Zer0x25/portal-control-2.0/commit/f8e2c1201f901cbe5f02c0f5ec8fea982d0f3c3d))

## [8.27.1](https://github.com/Zer0x25/portal-control-2.0/compare/v8.27.0...v8.27.1) (2026-10-10)


### Bug Fixes

* **a11y:** add aria-label to icon-only close buttons in modals ([0580608](https://github.com/Zer0x25/portal-control-2.0/commit/0580608122896eb98cd2efd4640aae32876b5bf5))
* **a11y:** add aria-label to icon-only close buttons in modals ([8b42a82](https://github.com/Zer0x25/portal-control-2.0/commit/8b42a8259306a0b0baff05bad49740ac0d8d76d7))

## [8.27.0](https://github.com/Zer0x25/portal-control-2.0/compare/v8.26.2...v8.27.0) (2026-10-09)


### Features

* **configs:** agregar esquema y validación de branding_logo con rangos de tamaño ([9e1ee93](https://github.com/Zer0x25/portal-control-2.0/commit/9e1ee9324304f47c5a69589973dc10325848c69e))
* **configs:** configurable brand logo with public read and admin upload ([3f12c18](https://github.com/Zer0x25/portal-control-2.0/commit/3f12c189595cf640eab71c56e64c70692d7366bc))
* **configs:** documentar endpoints en OpenAPI y sincronizar SDK frontend ([2ae3157](https://github.com/Zer0x25/portal-control-2.0/commit/2ae31573f6801525916edadcfa3d8f9d55514487))
* **configs:** exponer lectura pública y subida de logo con guards de rol ([844ee04](https://github.com/Zer0x25/portal-control-2.0/commit/844ee042741beadca2872cf221557c94f3dc23bb))
* **frontend:** agregar hook público y componente BrandLogo con fallback anti-CLS ([b4017e5](https://github.com/Zer0x25/portal-control-2.0/commit/b4017e5705f43e06c5ac222485523409b928b2b3))
* **frontend:** agregar sección de marca en Configuración con vista previa y restablecer ([41a7090](https://github.com/Zer0x25/portal-control-2.0/commit/41a7090aa7bdc572f6250d4cb93a4d373462a701))
* **frontend:** consumir BrandLogo en LoginPage sin regresión visual ([5fecfaa](https://github.com/Zer0x25/portal-control-2.0/commit/5fecfaae1e6446ef58058ee83fb985f531db1788))

## [8.26.2](https://github.com/Zer0x25/portal-control-2.0/compare/v8.26.1...v8.26.2) (2026-10-09)


### Bug Fixes

* **corrections:** resolve multi-click race condition and 12h shift break validation ([b8fa3cd](https://github.com/Zer0x25/portal-control-2.0/commit/b8fa3cd2c2f815ea994f279585882e75832b7de0))


### Performance Improvements

* **frontend:** css-first rendering, hardened client and serving optimizations ([#34](https://github.com/Zer0x25/portal-control-2.0/issues/34)) ([ced79e3](https://github.com/Zer0x25/portal-control-2.0/commit/ced79e31db20e77660a5609ce347fbf134e37a21))

## [8.26.1](https://github.com/Zer0x25/portal-control-2.0/compare/v8.26.0...v8.26.1) (2026-10-09)


### Bug Fixes

* **e2e:** harden test suite, resolve a11y contrast regressions and add headless navigation coverage ([#31](https://github.com/Zer0x25/portal-control-2.0/issues/31)) ([f848754](https://github.com/Zer0x25/portal-control-2.0/commit/f8487549371f80952ec9a33f511f5d6dfa7223ba))

## [8.26.0](https://github.com/Zer0x25/portal-control-2.0/compare/v8.25.2...v8.26.0) (2026-10-09)


### Features

* **frontend:** establish design system governance, living showcase, and drift auditor ([#28](https://github.com/Zer0x25/portal-control-2.0/issues/28)) ([ca7611a](https://github.com/Zer0x25/portal-control-2.0/commit/ca7611a4474345e125288b22d6e50c0c4fb5e771))
* **governance:** enforce sdd cycle and adr scaffolding workflow ([9c71c92](https://github.com/Zer0x25/portal-control-2.0/commit/9c71c92af50b487ec872175ba6b4f84036c6f3ea))
* **ui:** standardize application views with responsive container and design system governance ([#30](https://github.com/Zer0x25/portal-control-2.0/issues/30)) ([dcab8f9](https://github.com/Zer0x25/portal-control-2.0/commit/dcab8f9e1b135339a22add32041176d95258c3d0))

## [8.25.2](https://github.com/Zer0x25/portal-control-2.0/compare/v8.25.1...v8.25.2) (2026-10-08)


### Bug Fixes

* **e2e:** execute full test suite on staging and resolve a11y contrast and session eviction ([a991adf](https://github.com/Zer0x25/portal-control-2.0/commit/a991adf0a610b460775f012820ba9b47f4e2bf2e))


### Performance Improvements

* **ci:** skip heavy package verification on main merge per adr-0013 ([#25](https://github.com/Zer0x25/portal-control-2.0/issues/25)) ([8042d3c](https://github.com/Zer0x25/portal-control-2.0/commit/8042d3c159e581ec5899365a3b38556a253d2f6d))

## [8.25.1](https://github.com/Zer0x25/portal-control-2.0/compare/v8.25.0...v8.25.1) (2026-10-08)


### Performance Improvements

* **frontend:** comprehensive frontend optimization, state hygiene and tailwind v4 styling ([#23](https://github.com/Zer0x25/portal-control-2.0/issues/23)) ([74ffb90](https://github.com/Zer0x25/portal-control-2.0/commit/74ffb908c9194b099ccf6fcd0a2e79c8c84469c6))

## [8.25.0](https://github.com/Zer0x25/portal-control-2.0/compare/v8.24.0...v8.25.0) (2026-10-08)


### Features

* **agents:** add prisma-migration-safeguard workspace skill and db:precheck ([a928c2b](https://github.com/Zer0x25/portal-control-2.0/commit/a928c2b8fea8c2f8546ed5eb5b162a15dce608a8))
* **agents:** add workspace skills for api sync and ci preflight ([442da4e](https://github.com/Zer0x25/portal-control-2.0/commit/442da4e30176df936c1e0750c730e7abbd7c682a))


### Bug Fixes

* **frontend:** include playwright config in node tsconfig ([f99d837](https://github.com/Zer0x25/portal-control-2.0/commit/f99d8374d92dbc6b2a6df4ff232ca3d282cc68a1))


### Performance Improvements

* **ci:** speed up dependency installation with prefer-offline and loglevel ([63475fa](https://github.com/Zer0x25/portal-control-2.0/commit/63475fa929069b304d957d7ba64874e689b57aa5))

## [8.24.0](https://github.com/Zer0x25/portal-control-2.0/compare/v8.23.0...v8.24.0) (2026-10-08)

* Sincronización y publicación de tags de release.

## [8.23.0](https://github.com/Zer0x25/portal-control-2.0/compare/v8.22.0...v8.23.0) (2026-10-08)


### Features

* **auth:** migrate authentication routes to Fastify ([440de21](https://github.com/Zer0x25/portal-control-2.0/commit/440de21a2528986e1c8dfce3584847010079d559))
* **backend:** add modular Fastify foundation and holidays ([96d9c41](https://github.com/Zer0x25/portal-control-2.0/commit/96d9c41ebccd117c9eaee611c2d28975e1c8213c))
* **backend:** complete modular migration to Fastify ([c72ce98](https://github.com/Zer0x25/portal-control-2.0/commit/c72ce98c82b32b1757172f1ae40db8ee28142f9d))
* **dev:** add one-command local startup ([bbc7d20](https://github.com/Zer0x25/portal-control-2.0/commit/bbc7d202e970dd4bb4d91f2da2d1c0afbd695a44))
* **docker:** separate dev and local staging environments ([1e8d962](https://github.com/Zer0x25/portal-control-2.0/commit/1e8d962c31fcbe4c2df27d2482d951d658eb9faf))
* **employees:** migrate employee routes to Fastify ([44e73eb](https://github.com/Zer0x25/portal-control-2.0/commit/44e73eb1412a91555d26744a4edabdabb4f0eb8b))
* **fastify:** complete backend cutover for development ([5e7c123](https://github.com/Zer0x25/portal-control-2.0/commit/5e7c12305d7e5e4d6ba8a830d1b82bb462ba4b8b))
* **fastify:** integrate server runtime and jobs ([c2a31d2](https://github.com/Zer0x25/portal-control-2.0/commit/c2a31d2bb02f4a29c5447210bb91d27765712b5d))
* **fastify:** migrate administration and maintenance ([1fe261a](https://github.com/Zer0x25/portal-control-2.0/commit/1fe261a10e9de77837171bdf8c56ca88f9b74655))
* **fastify:** migrate audit module ([1f98dd5](https://github.com/Zer0x25/portal-control-2.0/commit/1f98dd523ac3df34b293146016047e44b60d6534))
* **fastify:** migrate email and scheduled reports ([feb4545](https://github.com/Zer0x25/portal-control-2.0/commit/feb4545e782d2f47cd1cd07b10acb019dc7da3a9))
* **fastify:** migrate import and export module ([6fb3e2b](https://github.com/Zer0x25/portal-control-2.0/commit/6fb3e2bdbd33a079fe2728a5761fe674b8441afc))
* **fastify:** migrate KPI module ([9bc66d3](https://github.com/Zer0x25/portal-control-2.0/commit/9bc66d33dcbcfe66a6be9eb09de640a58f1bd1b6))
* **fastify:** migrate leaves and corrections modules ([7d2cc1c](https://github.com/Zer0x25/portal-control-2.0/commit/7d2cc1c797531520b1097d3ba2018c4f078a667a))
* **fastify:** migrate meters notes and configuration ([64ba38b](https://github.com/Zer0x25/portal-control-2.0/commit/64ba38b6c43ecb188de2789108ccaec0fa26d801))
* **fastify:** migrate records and shifts modules ([9d8e101](https://github.com/Zer0x25/portal-control-2.0/commit/9d8e101e6ff4f96abffe0ad20439f66cbcb282c2))
* **fastify:** migrate shift reports module ([9863d3d](https://github.com/Zer0x25/portal-control-2.0/commit/9863d3d80e3ff4e5304d76e4bbaa2fe0d6ff66aa))
* **frontend:** real weather via Open-Meteo, close TD-002 ([61dba33](https://github.com/Zer0x25/portal-control-2.0/commit/61dba3317065cc46d9f7c81effd8733c90651bc7))
* **staging:** opt-in e2e worker seed for prod-mode stacks ([49dcd65](https://github.com/Zer0x25/portal-control-2.0/commit/49dcd65e41f961ee3fede63c11a95b8082ebae9a))
* **users:** migrate user routes to Fastify ([384ba28](https://github.com/Zer0x25/portal-control-2.0/commit/384ba2858cf36f7a9e01ee03af70e9ec8ddf8ae5))
* **weather:** geoaware location with hardened 30min cache ([de6eb21](https://github.com/Zer0x25/portal-control-2.0/commit/de6eb219c81612db4d64e9c34bee2e6f1157dafb))


### Bug Fixes

* **a11y:** dashboard report badge and responsible contrast ([a9b2b18](https://github.com/Zer0x25/portal-control-2.0/commit/a9b2b181482cc25f4415e5e3702cfeee4060975e))
* **api:** database unreachable maps to 503 plus soak runner ([3b0f894](https://github.com/Zer0x25/portal-control-2.0/commit/3b0f894a5bb82b8062805eae185014c513961daf))
* **auth:** enforce session limit post-insert against concurrent logins ([3e9e95a](https://github.com/Zer0x25/portal-control-2.0/commit/3e9e95ad818c75dce7f83e48263555fae92e62c8))
* **auth:** harden MFA attempts and public user payloads ([8915f5f](https://github.com/Zer0x25/portal-control-2.0/commit/8915f5ffc13feacb39ed6cb6368c3b615675836d))
* **auth:** serialize session insert plus trim under per-user lock ([7da4bd3](https://github.com/Zer0x25/portal-control-2.0/commit/7da4bd385cb905ce03f8cb0dd32bef2034488a53))
* **auth:** throttle kiosk-login per ip and employee ([ab19768](https://github.com/Zer0x25/portal-control-2.0/commit/ab197680e1afe0bfdc0d2301dc83bb446af0a5e5))
* **authz:** scope kiosk corrections and shift assignments ([9fe8d93](https://github.com/Zer0x25/portal-control-2.0/commit/9fe8d936c28dcb0b87683418f0327b818f0c359d))
* **backend:** make concurrent logins race-safe with session jti ([3626ed4](https://github.com/Zer0x25/portal-control-2.0/commit/3626ed4553328f1690350b811abbc5fea81055d4))
* **backend:** map attendance rule errors to 400 instead of 500 ([f579852](https://github.com/Zer0x25/portal-control-2.0/commit/f579852c98501943b2d1a76ec5426640d3bde0b3))
* **backup:** restore atomically and publish verified backups ([8d5be7d](https://github.com/Zer0x25/portal-control-2.0/commit/8d5be7d76b510e1c581fa346d01ac9d6a21529ae))
* **ci:** allowlist e2e fixtures in secret-scan ([4d72e05](https://github.com/Zer0x25/portal-control-2.0/commit/4d72e059f7a7ea3314f0bc3cbcdae41dcba1a564))
* **ci:** switch smoke to staging and PG18 stack ([3210131](https://github.com/Zer0x25/portal-control-2.0/commit/3210131a0d14c84c7d3f23004f1a5f842b83bc94))
* **configs:** make audited writes and policy replacement consistent ([2c6fde5](https://github.com/Zer0x25/portal-control-2.0/commit/2c6fde5771eb90261d35eecdfe7c87fa72554de9))
* **corrections:** enforce employee and record ownership ([5fda49b](https://github.com/Zer0x25/portal-control-2.0/commit/5fda49b7774e9d1b3fdaf5059c0cd0d33e85347b))
* **corrections:** single-winner concurrent approve via conditional update ([5f64330](https://github.com/Zer0x25/portal-control-2.0/commit/5f64330e0d168122cb78aa6da4e651247a9dcc8b))
* **data-tools:** harden queries and make note mutations atomic ([83e284f](https://github.com/Zer0x25/portal-control-2.0/commit/83e284f928891acae9b589cf973fc813b8090d98))
* **deploy:** copy prisma.config.ts into production image ([e191b08](https://github.com/Zer0x25/portal-control-2.0/commit/e191b08bee49b9876a03b56a830787038382c605))
* **dev:** load backend .env before module evaluation ([ab89d36](https://github.com/Zer0x25/portal-control-2.0/commit/ab89d362f8e696116b47f9f1420e788e0ed0806f))
* **email,import:** send-test contract plus invalid excel maps to 400 ([9c4006b](https://github.com/Zer0x25/portal-control-2.0/commit/9c4006b2b94bef7ace148e601669026b5d65c7c9))
* **email:** align contracts and execute scheduled reports by Chile cron ([e0eb241](https://github.com/Zer0x25/portal-control-2.0/commit/e0eb241734a3fff22a170eb2f380878513fea652))
* **exports:** render real PDFs and align Chile dates and import mapping ([f2a1d9c](https://github.com/Zer0x25/portal-control-2.0/commit/f2a1d9c8bcd9ef37022b9470b0d57226c4572528))
* **fastify:** retire Express and resolve post-migration technical debt ([8546197](https://github.com/Zer0x25/portal-control-2.0/commit/8546197fba08e51693bceca37dea41f8af486fc0))
* **frontend:** add ARIA labels to icon-only buttons ([baeff29](https://github.com/Zer0x25/portal-control-2.0/commit/baeff2971dc354fb619cd9d5c3fbee15bd16a853))
* **frontend:** close IDB handle before deleteDB in wipeAllData ([7cb3e8b](https://github.com/Zer0x25/portal-control-2.0/commit/7cb3e8b05ad48359b6ce4dbc64c521c42828b4ac))
* **frontend:** close TD-001 contrast gaps, gate serious in a11y ([53c491d](https://github.com/Zer0x25/portal-control-2.0/commit/53c491df3c1a9e31e2305a4cb14ff1ca2a10ee5c))
* **frontend:** memoize zustand object selectors with useShallow ([a05921d](https://github.com/Zer0x25/portal-control-2.0/commit/a05921d834fa9a2fdfd2046619b63ff16f65bf52))
* **kpis:** invalidate monthly cache on source changes ([e204846](https://github.com/Zer0x25/portal-control-2.0/commit/e2048463579a1dd4cc9aef9f05f8ba79f751c200))
* **kpis:** materialize full months and rebuild invalid cache ([71b7b8b](https://github.com/Zer0x25/portal-control-2.0/commit/71b7b8b8e528b3a5d185193b79519a4e1b2bb94c))
* **kpis:** use Chile dates and yesterday scheduling context ([9d9d443](https://github.com/Zer0x25/portal-control-2.0/commit/9d9d443a2f3064bbc580a6fc51ba37d76e2d0dff))
* **leaves:** serialize leave changes and materialize atomically ([3e43f08](https://github.com/Zer0x25/portal-control-2.0/commit/3e43f08cf3301ae9e5a4c12c5ad97774f04a9192))
* **meters:** persist batches atomically with session authorship ([608cd4c](https://github.com/Zer0x25/portal-control-2.0/commit/608cd4c11952f988540795a9161eec2368134386))
* **punch:** serialize concurrent punches per employee via advisory lock ([8800224](https://github.com/Zer0x25/portal-control-2.0/commit/88002248cc9d326d4fe5f8a0061673a7bf013fde))
* **realtime:** authenticate sockets and revalidate sessions ([c8767d3](https://github.com/Zer0x25/portal-control-2.0/commit/c8767d31ba531747097782178263438793ec1e27))
* **realtime:** authorize events and redact protected audits ([c6caf5c](https://github.com/Zer0x25/portal-control-2.0/commit/c6caf5ca4cedd7a9ce24437aa1057f4918488e22))
* **records:** mint id server-side on create plus tsx watch for dev ([2d3fbff](https://github.com/Zer0x25/portal-control-2.0/commit/2d3fbff465cc195b9c5f272c384500f7f0b11bed))
* **runtime:** claim report occurrences and reduce KPI write contention ([60695e5](https://github.com/Zer0x25/portal-control-2.0/commit/60695e56778cfaa4c0f9dbfd9f88b1c7b2c96016))
* **runtime:** coordinate and drain distributed work ([2163f6a](https://github.com/Zer0x25/portal-control-2.0/commit/2163f6a3c0d204e4d5e61069ba20dfcbcfe798c1))
* **runtime:** drain administrative operations before jobs and pools ([591277b](https://github.com/Zer0x25/portal-control-2.0/commit/591277bcf9ef2eb047e55a2139dca1de3f4bbcea))
* **runtime:** retain seed ownership and drain real workers before shutdown ([c96be85](https://github.com/Zer0x25/portal-control-2.0/commit/c96be8597b4bd4c89453ac312a429c01dcf65f49))
* **security:** redact HTTP secrets and make database reset atomic ([113c66a](https://github.com/Zer0x25/portal-control-2.0/commit/113c66ae59579a4229e923302821761a9306fae2))
* **shift-reports:** normalize legacy entries in exports ([0eab2ae](https://github.com/Zer0x25/portal-control-2.0/commit/0eab2ae985d09bf0c8b8fe4bfdbf8bdffd2d2f5b))
* **shift-reports:** serialize lifecycle and persist audits atomically ([b1593c8](https://github.com/Zer0x25/portal-control-2.0/commit/b1593c84b848922aaae3abe488066b4619ffd72a))
* **shifts:** align monthly calendar with Chile business dates ([fdb10cd](https://github.com/Zer0x25/portal-control-2.0/commit/fdb10cdb3aef95ff8ca3ad6f1bd300ecba0bffa9))


### Performance Improvements

* **ci:** optimize verify-backend workflow and test execution ([abb402d](https://github.com/Zer0x25/portal-control-2.0/commit/abb402ddfc486002f91ca56dcbbcdc009770daf1))
* **ci:** optimize verify-backend workflow and test execution ([fda367c](https://github.com/Zer0x25/portal-control-2.0/commit/fda367cf31e92bbc38afd0273dfd71b8a1320516))
* **kpi:** optimize getDailyPlanningSummary concurrency ([3d6ed9b](https://github.com/Zer0x25/portal-control-2.0/commit/3d6ed9b1d9f849141fa944f4f018acf6c09f0a8f))

## [8.22.0](https://github.com/Zer0x25/portal-control-2.0/compare/v8.21.0...v8.22.0) (2026-10-04)


### Features

* **docker:** separate dev and local staging environments ([1e8d962](https://github.com/Zer0x25/portal-control-2.0/commit/1e8d962c31fcbe4c2df27d2482d951d658eb9faf))
* **frontend:** real weather via Open-Meteo, close TD-002 ([61dba33](https://github.com/Zer0x25/portal-control-2.0/commit/61dba3317065cc46d9f7c81effd8733c90651bc7))
* **staging:** opt-in e2e worker seed for prod-mode stacks ([49dcd65](https://github.com/Zer0x25/portal-control-2.0/commit/49dcd65e41f961ee3fede63c11a95b8082ebae9a))
* **weather:** geoaware location with hardened 30min cache ([de6eb21](https://github.com/Zer0x25/portal-control-2.0/commit/de6eb219c81612db4d64e9c34bee2e6f1157dafb))


### Bug Fixes

* **a11y:** dashboard report badge and responsible contrast ([a9b2b18](https://github.com/Zer0x25/portal-control-2.0/commit/a9b2b181482cc25f4415e5e3702cfeee4060975e))
* **api:** database unreachable maps to 503 plus soak runner ([3b0f894](https://github.com/Zer0x25/portal-control-2.0/commit/3b0f894a5bb82b8062805eae185014c513961daf))
* **auth:** enforce session limit post-insert against concurrent logins ([3e9e95a](https://github.com/Zer0x25/portal-control-2.0/commit/3e9e95ad818c75dce7f83e48263555fae92e62c8))
* **auth:** serialize session insert plus trim under per-user lock ([7da4bd3](https://github.com/Zer0x25/portal-control-2.0/commit/7da4bd385cb905ce03f8cb0dd32bef2034488a53))
* **auth:** throttle kiosk-login per ip and employee ([ab19768](https://github.com/Zer0x25/portal-control-2.0/commit/ab197680e1afe0bfdc0d2301dc83bb446af0a5e5))
* **backend:** make concurrent logins race-safe with session jti ([3626ed4](https://github.com/Zer0x25/portal-control-2.0/commit/3626ed4553328f1690350b811abbc5fea81055d4))
* **backend:** map attendance rule errors to 400 instead of 500 ([f579852](https://github.com/Zer0x25/portal-control-2.0/commit/f579852c98501943b2d1a76ec5426640d3bde0b3))
* **ci:** allowlist e2e fixtures in secret-scan ([4d72e05](https://github.com/Zer0x25/portal-control-2.0/commit/4d72e059f7a7ea3314f0bc3cbcdae41dcba1a564))
* **corrections:** single-winner concurrent approve via conditional update ([5f64330](https://github.com/Zer0x25/portal-control-2.0/commit/5f64330e0d168122cb78aa6da4e651247a9dcc8b))
* **deploy:** copy prisma.config.ts into production image ([e191b08](https://github.com/Zer0x25/portal-control-2.0/commit/e191b08bee49b9876a03b56a830787038382c605))
* **email,import:** send-test contract plus invalid excel maps to 400 ([9c4006b](https://github.com/Zer0x25/portal-control-2.0/commit/9c4006b2b94bef7ace148e601669026b5d65c7c9))
* **frontend:** close IDB handle before deleteDB in wipeAllData ([7cb3e8b](https://github.com/Zer0x25/portal-control-2.0/commit/7cb3e8b05ad48359b6ce4dbc64c521c42828b4ac))
* **frontend:** close TD-001 contrast gaps, gate serious in a11y ([53c491d](https://github.com/Zer0x25/portal-control-2.0/commit/53c491df3c1a9e31e2305a4cb14ff1ca2a10ee5c))
* **frontend:** memoize zustand object selectors with useShallow ([a05921d](https://github.com/Zer0x25/portal-control-2.0/commit/a05921d834fa9a2fdfd2046619b63ff16f65bf52))
* **punch:** serialize concurrent punches per employee via advisory lock ([8800224](https://github.com/Zer0x25/portal-control-2.0/commit/88002248cc9d326d4fe5f8a0061673a7bf013fde))
* **records:** mint id server-side on create plus tsx watch for dev ([2d3fbff](https://github.com/Zer0x25/portal-control-2.0/commit/2d3fbff465cc195b9c5f272c384500f7f0b11bed))

## [8.21.0](https://github.com/Zer0x25/portal-control/compare/v8.20.0...v8.21.0) (2026-10-02)


### Features

* **ci:** elevate CI/CD and README to modern agentic industry standards ([cfc4706](https://github.com/Zer0x25/portal-control/commit/cfc4706e28964a88604fa2e7453e0804467a3331))
* enhance timeRecord validation, add DB indexes and Jules agentic workflows ([83f8de1](https://github.com/Zer0x25/portal-control/commit/83f8de1aa1420fff56b1104845176b8fb74c9c27))
* **governance:** add coverage ratchet, e2e smoke and docs gates ([c2073f8](https://github.com/Zer0x25/portal-control/commit/c2073f875779614630c28f2b9f02b2755397c697))
* **kiosk:** refine actions and dev setup ([5410a6c](https://github.com/Zer0x25/portal-control/commit/5410a6cda2175983441a1c59ed77cd72772cbb1e))
* **security:** harden runtime CORS, body limits and forced password flow ([79460ed](https://github.com/Zer0x25/portal-control/commit/79460ed96a83a9c358c1b4c4842081a14c19db8d))
* **ui:** add a11y attributes to CinematicModal ([#6](https://github.com/Zer0x25/portal-control/issues/6)) ([e12226d](https://github.com/Zer0x25/portal-control/commit/e12226dbca2bf3994a975f7aa52ff81d0b52973e))


### Bug Fixes

* **backend:** hacer el snapshot del contrato inmune al orden del filesystem ([95efc7d](https://github.com/Zer0x25/portal-control/commit/95efc7df4c4931c9f7a43dba73add5d52f72d19a))
* **backend:** tini como entrypoint real (PID 1) en Dockerfile y compose para reaps de zombies ([b4cc8e2](https://github.com/Zer0x25/portal-control/commit/b4cc8e2d61432538dcdf1ff2736c46d20c094fcf))
* **backend:** usar tini como PID 1 para evitar zombies de prisma/seed/backup ([e012f0c](https://github.com/Zer0x25/portal-control/commit/e012f0c07b1ea6b33b9a6a03e0557c17c0f3e145))
* **ci:** allowlistar el auto-macheo del secret-scan en su propio fuente ([5950726](https://github.com/Zer0x25/portal-control/commit/5950726f4c43ad0f6d7e529b0a7f6b406bac5bd0))
* **ci:** inject sentry secret outside build matrix ([5731155](https://github.com/Zer0x25/portal-control/commit/573115507965bca0e016e82afc7c402925d366a3))
* **ci:** instalar deps del frontend antes de levantar compose en E2E ([3389934](https://github.com/Zer0x25/portal-control/commit/3389934d4b69e5371c831a55e75d8289478d0d47))
* **ci:** no cancelar corridas de main para no perder deploys ([682e705](https://github.com/Zer0x25/portal-control/commit/682e7050a27d9b051f8f20648a01d92a4989937b))
* **deploy:** build frontend image in docker ([d6f731b](https://github.com/Zer0x25/portal-control/commit/d6f731beef34cc07b30491db62d24b2683601f83))
* **deploy:** pin portal images by sha ([5b21c68](https://github.com/Zer0x25/portal-control/commit/5b21c6884bb5e790ec5d68b70761fade0d5f81ae))
* **deploy:** remove local builds from compose stack ([9279ae6](https://github.com/Zer0x25/portal-control/commit/9279ae693adb9c91ce1392def538219f8c04a155))
* **employees:** relax create transaction timeout ([bdb1b3b](https://github.com/Zer0x25/portal-control/commit/bdb1b3b876f0a0891b767c9883cfd8126f216dc5))
* **frontend:** allow blob workers in csp ([0c95633](https://github.com/Zer0x25/portal-control/commit/0c956331b20e6ccea0f62568ecc226d03e2dbfcb))
* **frontend:** auto-reload on dynamically imported module fetch failure ([6f841bd](https://github.com/Zer0x25/portal-control/commit/6f841bd1488e371cdb5ab9bcec1f8c28490511fc))
* Handle holiday work tracking duplication correctly ([#11](https://github.com/Zer0x25/portal-control/issues/11)) ([295eb7a](https://github.com/Zer0x25/portal-control/commit/295eb7a1038674030486ec0f2537f256c46e20f1))
* mitigate potential SQL injection in audit trail config ([#24](https://github.com/Zer0x25/portal-control/issues/24)) ([a1b1f34](https://github.com/Zer0x25/portal-control/commit/a1b1f3439c3c840d3b36bdcc0661b23b70a72de6))
* **supervisor:** connect real role check in SupervisorPermissionWrapper ([1e08142](https://github.com/Zer0x25/portal-control/commit/1e08142112d876ec63995741627a70a604960214))
* **tests:** dejar de pasar en vacio los guards de rutas y contrato ([a2b6025](https://github.com/Zer0x25/portal-control/commit/a2b602532df337d721a28829bb79c485abea91c0))


### Performance Improvements

* **ci:** correr la bateria pesada solo en PR y dejar gates en main ([bdffda0](https://github.com/Zer0x25/portal-control/commit/bdffda0b4369bf2abe6b86068a3c71e35aa6b343))
* **ci:** fail-fast en 2 etapas y eliminar job lint redundante ([a0523df](https://github.com/Zer0x25/portal-control/commit/a0523df2f89c45962863fbd68161b12d8369f332))
* **kpi:** fix N+1 query in calculatePeriodStats ([#12](https://github.com/Zer0x25/portal-control/issues/12)) ([3ba775b](https://github.com/Zer0x25/portal-control/commit/3ba775b21233de36d40256975880e38e45bb0de1))

## [8.20.0](https://github.com/Zer0x25/portal-control/compare/v8.19.2...v8.20.0) (2026-10-02)


### Features

* **ci:** elevate CI/CD and README to modern agentic industry standards ([cfc4706](https://github.com/Zer0x25/portal-control/commit/cfc4706e28964a88604fa2e7453e0804467a3331))
* enhance timeRecord validation, add DB indexes and Jules agentic workflows ([83f8de1](https://github.com/Zer0x25/portal-control/commit/83f8de1aa1420fff56b1104845176b8fb74c9c27))
* **ui:** add a11y attributes to CinematicModal ([#6](https://github.com/Zer0x25/portal-control/issues/6)) ([e12226d](https://github.com/Zer0x25/portal-control/commit/e12226dbca2bf3994a975f7aa52ff81d0b52973e))


### Bug Fixes

* Handle holiday work tracking duplication correctly ([#11](https://github.com/Zer0x25/portal-control/issues/11)) ([295eb7a](https://github.com/Zer0x25/portal-control/commit/295eb7a1038674030486ec0f2537f256c46e20f1))
* mitigate potential SQL injection in audit trail config ([#24](https://github.com/Zer0x25/portal-control/issues/24)) ([a1b1f34](https://github.com/Zer0x25/portal-control/commit/a1b1f3439c3c840d3b36bdcc0661b23b70a72de6))


### Performance Improvements

* **kpi:** fix N+1 query in calculatePeriodStats ([#12](https://github.com/Zer0x25/portal-control/issues/12)) ([3ba775b](https://github.com/Zer0x25/portal-control/commit/3ba775b21233de36d40256975880e38e45bb0de1))

## [8.19.2](https://github.com/Zer0x25/portal-control/compare/v8.19.1...v8.19.2) (2026-08-13)


### Bug Fixes

* **backend:** tini como entrypoint real (PID 1) en Dockerfile y compose para reaps de zombies ([b4cc8e2](https://github.com/Zer0x25/portal-control/commit/b4cc8e2d61432538dcdf1ff2736c46d20c094fcf))
* **backend:** usar tini como PID 1 para evitar zombies de prisma/seed/backup ([e012f0c](https://github.com/Zer0x25/portal-control/commit/e012f0c07b1ea6b33b9a6a03e0557c17c0f3e145))
* **frontend:** auto-reload on dynamically imported module fetch failure ([6f841bd](https://github.com/Zer0x25/portal-control/commit/6f841bd1488e371cdb5ab9bcec1f8c28490511fc))

## [8.19.1](https://github.com/Zer0x25/portal-control/compare/v8.19.0...v8.19.1) (2026-08-03)


### Bug Fixes

* **supervisor:** connect real role check in SupervisorPermissionWrapper ([1e08142](https://github.com/Zer0x25/portal-control/commit/1e08142112d876ec63995741627a70a604960214))

## [8.19.0](https://github.com/Zer0x25/portal-control/compare/v8.18.2...v8.19.0) (2026-03-21)


### Features

* **kiosk:** refine actions and dev setup ([5410a6c](https://github.com/Zer0x25/portal-control/commit/5410a6cda2175983441a1c59ed77cd72772cbb1e))


### Bug Fixes

* **frontend:** allow blob workers in csp ([0c95633](https://github.com/Zer0x25/portal-control/commit/0c956331b20e6ccea0f62568ecc226d03e2dbfcb))

## [8.18.2](https://github.com/Zer0x25/portal-control/compare/v8.18.1...v8.18.2) (2026-03-20)


### Bug Fixes

* **deploy:** pin portal images by sha ([5b21c68](https://github.com/Zer0x25/portal-control/commit/5b21c6884bb5e790ec5d68b70761fade0d5f81ae))
* **employees:** relax create transaction timeout ([bdb1b3b](https://github.com/Zer0x25/portal-control/commit/bdb1b3b876f0a0891b767c9883cfd8126f216dc5))

## [8.18.1](https://github.com/Zer0x25/portal-control/compare/v8.18.0...v8.18.1) (2026-03-19)


### Bug Fixes

* **ci:** inject sentry secret outside build matrix ([5731155](https://github.com/Zer0x25/portal-control/commit/573115507965bca0e016e82afc7c402925d366a3))
* **deploy:** build frontend image in docker ([d6f731b](https://github.com/Zer0x25/portal-control/commit/d6f731beef34cc07b30491db62d24b2683601f83))
* **deploy:** remove local builds from compose stack ([9279ae6](https://github.com/Zer0x25/portal-control/commit/9279ae693adb9c91ce1392def538219f8c04a155))
