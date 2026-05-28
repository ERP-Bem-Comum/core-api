# W2 REVIEW — CTR-IMPORT-LEGACY-CLI

> **Skill:** `code-reviewer` · **Veredito:** ✅ APPROVED · **Round:** 1/3 · **Data:** 2026-05-25

## Escopo auditado

- `src/modules/contracts/cli/import-parser.ts`
- `src/modules/contracts/cli/commands/importar-contratos.ts`
- `src/modules/contracts/cli/formatters/import-report.ts` (+ `index.ts`, `error.ts`)
- `src/modules/contracts/cli/registry.ts`

## Correções aplicadas durante o gate de lint (W2)

O gate `pnpm run lint` reprovou o W1 com 7 erros em código de produção — corrigidos:

| Erro | Fix |
| :--- | :--- |
| `no-base-to-string` (5×): `String(unknown)` podia gerar `[object Object]` | `asString`/`asNullableString` coagem **apenas primitivos**; objeto/array → `''` (dado inválido reportado downstream) |
| `init-declarations` (2×): `let data`/`let content` sem init | wrappers `tryParseJson` e `readFileUtf8` retornando `Result` (padrão `nodejs-fs-scripter`) |

## Audit log

| Regra | Verificação | OK |
| :--- | :--- | :--- |
| IO só na borda (NFR-5) | `readFile` no comando (via `readFileUtf8`→Result); parser é puro | ✅ |
| sem `throw` cruzando borda | `try/catch` convertido em `Result` no parser e no comando | ✅ |
| switch exaustivo sem default | `parseImportRows` (csv/json) e `formatImportParseError` exaustivos | ✅ |
| sem dependência nova (ADR-0011) | tokenizer CSV hand-rolled; JSON nativo | ✅ |
| `import type` p/ tipos; `.ts` nas extensões | conforme | ✅ |
| reuso do use case (não reimplementa regra) | comando só orquestra IO→parser→`importContracts`→formatter | ✅ |
| PT-BR na borda | `formatImportReport`/`formatImportParseError`; falhas via `formatErrorCode` | ✅ |
| exit codes sysexits | 64 uso / 65 EX_DATAERR / 66 EX_NOINPUT / 74 EX_IOERR | ✅ |
| dry-run default seguro | `dryRun = !('confirmar' in flags)`; `persist()` só com `--confirmar` | ✅ |
| módulo isolation (ADR-0014) | só `contracts/` | ✅ |

## Gate

```
> eslint .
(zero erros)
```

## Veredito

**APPROVED** — segue para W3.
