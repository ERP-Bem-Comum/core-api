# W0 — RED — FIN-DOC-READER-PORT

Wave W0 (fail-first). Skill: **`tdd-strategist`** (orquestrado). Módulo `financial`, feature 034 (fatia 1, épico #62), ADR-0050. Só testes RED — nenhum `src/` de produção tocado. **Isolamento worktree confirmado pelo fiscal** (arquivos sob `fin-ocr/`, ausentes no checkout `go-live`).

## Arquivos RED criados (sob o worktree `fin-ocr/`)
- `tests/modules/financial/adapters/document-reader/mock.test.ts` — CA1, CA3
- `tests/modules/financial/adapters/document-reader/cascade.test.ts` — CA4
- `tests/modules/financial/domain/document-reader/types.test.ts` — CA1, CA2

Convenções (`.claude/rules/testing.md`): `node:test` + `node:assert/strict`, `#src/*` subpath imports, AAA, fakes injetáveis (readers fake na cascata; seed no mock).

## Mapeamento CA → teste
- **CA1** port exercido via `const reader: DocumentReaderPort = …` + `await reader.read(input)` → `Result` (não-interface/class fica p/ W2).
- **CA2** `types.test.ts`: `Object.keys ⊆` permitido, `'text'/'rawText'/'conteudo' in result === false` (minimização), discriminante `resolvedVia`, union de erros exato (guard bidirecional).
- **CA3** mock `{ result }`→`ok`; `{ error }`→`err`; determinístico.
- **CA4** cascata: XML resolve → `'xml'` (precedência, nativo não consultado); XML falha + nativo resolve → `'native-text'`; ambos falham → `err('scanned-unsupported')`.

## Saída literal RED (`pnpm test` + re-run do fiscal)
```
✖ tests/modules/financial/adapters/document-reader/cascade.test.ts
✖ tests/modules/financial/adapters/document-reader/mock.test.ts
✖ tests/modules/financial/domain/document-reader/types.test.ts
ℹ tests 3582 · pass 3561 · fail 3 (só os novos) · skipped 18 (integração pré-existente)
```
Causa raiz esperada: `ERR_MODULE_NOT_FOUND` em `.../document-reader/errors.ts`. Sem regressão.

## Armadilha fail-first tratada
`types.test.ts` inicialmente passava em falso GREEN (só `import type`, removido pelo `--experimental-strip-types` → módulo inexistente nunca carregava). Corrigido ancorando num value import de runtime.

## Refinamento de contrato p/ W1 (transparente)
`domain/document-reader/errors.ts` exporta a witness e deriva o union:
```ts
export const DOCUMENT_READER_ERRORS = ['scanned-unsupported','unsupported-pdf-structure','decompression-limit-exceeded','source-too-large','empty-input','malformed-document'] as const;
export type DocumentReaderError = (typeof DOCUMENT_READER_ERRORS)[number];
```

## Próximo — W1 (GREEN)
Skills `ts-domain-modeler` + `ports-and-adapters`. Ordem: `domain/document-reader/{types,errors}.ts` → `application/ports/document-reader.ts` → `adapters/document-reader/{mock,cascade}.ts`, mínimo até GREEN.
