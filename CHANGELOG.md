# Changelog

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
