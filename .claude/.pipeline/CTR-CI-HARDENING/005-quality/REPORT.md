# W3 — GREEN

Gate completo verde após o polish do W2 (regex de pin mais estrito):

- `pnpm run typecheck` → OK (`tsc --noEmit`)
- `pnpm run format:check` → OK
- `pnpm run lint` → OK (`eslint .`)
- `pnpm test` → **2027 pass, 0 fail, 17 skipped** (skips = integração opt-in).

Inclui o teste novo `tests/infra/ci-workflow-hardening.test.ts` (5/5).

Nota: `actionlint` em si roda no CI (job dedicado, `reviewdog/action-actionlint` pinado por SHA); não há binário local.
