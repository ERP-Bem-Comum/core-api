# W1 GREEN — CTR-IMPORT-LEGACY-CLI

> **Skills:** `nodejs-fs-scripter` (leitura) + `application-cli-builder` (parser + comando) · **Outcome:** GREEN · **Data:** 2026-05-25

## Arquivos criados/editados

| Arquivo | Ação |
| :--- | :--- |
| `src/modules/contracts/cli/import-parser.ts` | **criado** — `parseImportRows(content, format)` puro. CSV tokenizado à mão (subset RFC-4180: aspas, vírgula/quebra dentro de aspas, `""`), JSON via `JSON.parse`. Mapeia snake→camel, coage a string, `fim` vazio → `null`, valida colunas obrigatórias. **Zero dependência.** |
| `src/modules/contracts/cli/formatters/import-report.ts` | **criado** — `formatImportReport` (PT-BR, falhas por linha via `formatErrorCode`) + `formatImportParseError`. |
| `src/modules/contracts/cli/formatters/index.ts` | export do novo formatter. |
| `src/modules/contracts/cli/formatters/error.ts` | string PT de `import-cnpj-invalid`. |
| `src/modules/contracts/cli/commands/importar-contratos.ts` | **criado** — flags `--arquivo`/`--formato`/`--confirmar`; lê arquivo (`node:fs/promises`, UTF-8, erro→exit 66); parse (erro→exit 65); `importContracts`; dry-run default, `ctx.persist()` só com `--confirmar`. |
| `src/modules/contracts/cli/registry.ts` | registra `importar-contratos`. |

## Decisões aplicadas

- **Sem dependência CSV** (ADR-0011): tokenizer hand-rolled.
- **Dry-run default**, `--confirmar` persiste.
- Exit codes: 64 (uso), 65 EX_DATAERR (parse/estrutura), 66 EX_NOINPUT (arquivo), 74 EX_IOERR (persist/infra).

## Saída literal dos gates

`node --test` (parser + E2E):

```
ℹ tests 12
ℹ pass 12
ℹ fail 0
```

`pnpm test` (suíte completa, +12, zero regressão):

```
ℹ tests 1149
ℹ pass 1133
ℹ fail 0
ℹ skipped 16
```

`pnpm run typecheck`: zero erros.

## Próximo passo

W2 REVIEW (`code-reviewer`).
