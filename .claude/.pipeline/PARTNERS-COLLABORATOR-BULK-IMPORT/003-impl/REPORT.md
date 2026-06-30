# W1 — GREEN · PARTNERS-COLLABORATOR-BULK-IMPORT

**Skill:** application-cli-builder · **Resultado:** GREEN (7/7)

## Arquivo criado

`src/modules/partners/application/use-cases/import-collaborators.ts` — `importCollaborators(deps)(cmd)`.
Tipos `ImportCollaboratorsCommand`, `ImportCollaboratorFailure` (`{index, error}`), `ImportCollaboratorsOutput`
(`{importedCount, failed, isPartialImport}`).

## Decisões de design

- **Reusa `registerCollaborator`** linha a linha (DRY) — domínio + unicidade CPF/email (banco e
  intra-arquivo) + save por linha. Zero reimplementação.
- **Loop sequencial** (`for ... of rows.entries()` + `await`) — intencional para unicidade intra-arquivo
  determinística ("primeira ocorrência ganha"). `eslint-disable no-await-in-loop` com justificativa inline.
- **`Result<_, never>`** — import parcial nunca é erro global; falhas vão em `failed`. Sempre `ok(report)`.
- **`index` 0-based** — a tradução para "linha do arquivo" (com header) fica na borda CSV futura.
- **`isPartialImport = importedCount > 0 && failed.length > 0`** (alinhado ao `ImportResult` legado).

## Confirmação GREEN

```
ℹ tests 7 · pass 7 · fail 0
```
