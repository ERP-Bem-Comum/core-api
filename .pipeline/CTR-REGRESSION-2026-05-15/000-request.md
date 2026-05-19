# CTR-REGRESSION-2026-05-15 — Regressão consolidada (REVIEW + E2E-SECURITY-REVIEW)

## Escopo

Aplicar fixes derivados de **dois relatórios** ao módulo `contracts`:

1. `tests/reports/REVIEW.md` — Gemini code review (2026-05-14)
2. `tests/reports/E2E-SECURITY-REVIEW.md` — Claude security-reviewer (2026-05-15, 85 casos, REJECTED)

Os fixes formam **10 issues numeradas** (REGR #1..#10), todas com teste RED escrito em
`tests/regression/reports-2026-05-15.test.ts` (16 testes em 10 `describe` blocks).

## Estado RED inicial (W0)

```
node --test --experimental-strip-types tests/regression/reports-2026-05-15.test.ts
ℹ tests 16
ℹ pass 3
ℹ fail 13
```

## Saída esperada

- 16/16 GREEN nos testes da regressão.
- W2 APPROVED (max 3 rounds).
- W3 zero erros em `pnpm typecheck`, `pnpm format:check`, `pnpm test`, `pnpm lint`.
- Suite completa segue passando (sem regressões nas demais suites).

## Restrições

- Zero `throw` em domain/application; adapters convertem para `Result` na borda.
- Zero `class`, zero `this`, `Readonly<>` sempre.
- `Result<T, E>` com string literal error unions.
- Sem novas libs (apenas `node:*` + as já listadas em `package.json`).

## Mapa REGR → camada / skill / arquivos

| REGR | Camada           | Skill canônica            | Arquivos prováveis                                                                 |
| ---- | ---------------- | ------------------------- | ---------------------------------------------------------------------------------- |
| #1   | CLI boundary I/O | ts-domain-modeler         | `src/modules/contracts/cli/state.ts` (smart constructor na borda do loadState)     |
| #2   | CLI runtime      | ts-domain-modeler         | mesmos arquivos #1 + remover `throw unreachable` em `main.ts:50`, `criar-aditivo.ts:64`, `contract.ts:192`, `amendment.ts:46`, `create-amendment.ts:89` |
| #3   | CLI I/O          | application-cli-builder   | `src/modules/contracts/cli/state.ts` (atomic write: tmp+rename + flock)            |
| #4   | CLI formatters   | application-cli-builder   | `src/modules/contracts/cli/formatters/contract.ts`, `amendment.ts` (strip control chars) |
| #5   | adapters         | ports-and-adapters        | `src/modules/contracts/adapters/persistence/drivers/sqlite-driver.ts` (remover process.stderr.write) |
| #6   | CLI parser       | application-cli-builder   | `src/modules/contracts/cli/main.ts` + `parse-driver-flags.ts`                      |
| #7   | application      | ts-domain-modeler         | `src/modules/contracts/application/use-cases/create-amendment.ts`                  |
| #8   | CLI UX           | application-cli-builder   | `src/modules/contracts/cli/main.ts` (printUsage stdout/stderr conforme contexto)   |
| #9   | CLI parser       | application-cli-builder   | `src/modules/contracts/cli/parse-flags.ts` (detectar key duplicada)                |
| #10  | CLI parser       | application-cli-builder   | `src/modules/contracts/cli/parse-driver-flags.ts` (validar `rest` contra allowlist do subcomando) |
