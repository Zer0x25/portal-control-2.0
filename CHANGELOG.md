# Changelog

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
