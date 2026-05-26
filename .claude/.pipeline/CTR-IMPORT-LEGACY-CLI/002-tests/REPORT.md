# W0 RED — CTR-IMPORT-LEGACY-CLI

> **Skill:** `tdd-strategist` · **Outcome:** RED · **Data:** 2026-05-25

## Arquivos criados

| Arquivo | Cobre |
| :--- | :--- |
| `tests/modules/contracts/cli/import-parser.test.ts` | parser CSV/JSON: happy, aspas/vírgula/`""` (CA-6), coluna ausente (CA-3), JSON==CSV (CA-4), vazio/malformado |
| `tests/cli/contracts.cli.import.test.ts` | E2E comando: dry-run não persiste (CA-2), `--confirmar` persiste (CA-1), JSON (CA-4), estrutural (CA-3), arquivo inexistente (CA-5) |

**Contrato público que o W1 deve cumprir:**

```ts
// src/modules/contracts/cli/import-parser.ts
export const parseImportRows = (
  content: string, format: 'csv' | 'json',
) => Result<readonly ImportContractRow[], ImportParseError>;
// + comando cli/commands/importar-contratos.ts (flags --arquivo/--formato/--confirmar) + registro
```

## Saída literal do gate (`node --test`)

Parser — RED por inexistência do módulo:

```
Error [ERR_MODULE_NOT_FOUND]: .../cli/import-parser.ts
ℹ tests 1 · pass 0 · fail 1
```

E2E:

```
ℹ tests 5 · pass 2 · fail 3
```

- 3 fails legítimos: dry-run (exit 64≠0), `--confirmar`+listar (não mostra 700/2026), JSON.
- 2 "pass" = colisão transitória: CA-3/CA-5 esperam exit≠0 e o subcomando desconhecido devolve 64.
  Viram verdes legítimos após o W1.

## Próximo passo (W1)

`nodejs-fs-scripter` (leitura UTF-8) + `application-cli-builder` (parser hand-rolled CSV +
comando). Sem nova dependência (decisão registrada no `000-request`).
