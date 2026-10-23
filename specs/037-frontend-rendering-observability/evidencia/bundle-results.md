# Spec 037: bundle and build evidence

The baseline was built from clean remote main at
`32f438f29f7a96484efa7e400aa5a146d1772a41`. Final measurements come from the
rebased spec worktree on 2026-10-23. Both builds use the same host and the
`bundleBudgetPolicy.cjs` file-size and precache-manifest scanner.

| Output       |         Baseline on `main` |             Final worktree |       Limit |
| ------------ | -------------------------: | -------------------------: | ----------: |
| `react-core` | 218,693 B / 68.21 KiB gzip | 218,860 B / 68.31 KiB gzip |   266,240 B |
| `charts`     | 145,613 B / 51.05 KiB gzip | 145,613 B / 51.05 KiB gzip |   184,320 B |
| PWA precache |  1,712,232 B / 185 entries |  1,999,745 B / 186 entries | 2,097,152 B |

The final budget gate passed. Its report rounds the final values to
`react-core=213.7 KiB`, `charts=142.2 KiB`, and `precache=1952.9 KiB`; the
precache has 97,407 bytes of headroom. The measured precache is 280.8 KiB above
the new-main baseline, while the `react-core` chunk grew by 167 bytes and the
`charts` chunk is unchanged. The PWA precache includes all build outputs, so
the final comparison includes the spec work and changes already present in the
rebased main.
