# W0 — RED — FIN-DOC-READER-CASCADE

Wave W0 (fail-first). Skill: **`tdd-strategist`**. Módulo `financial`, feature 034 (fecho da cascata), ADR-0050. Teste de INTEGRAÇÃO RED — nenhum `src/` de produção tocado.

## Teste RED — `create-document-reader.test.ts` (integração dos 3 readers reais)

Reusa as fixtures já entregues (`xml-fixtures.ts`, `pdf-fixtures.ts`) — os readers reais, não fakes:

| CA | Fixture | Assere |
| :-- | :-- | :-- |
| CA1 | `NFSE_NACIONAL` (XML) | `resolvedVia='xml'` + campos (o nativo não é consultado) |
| CA2/CA3 | `NFSE_NATIVE` (PDF) | XML falha → cascata resolve por nativo → `resolvedVia='native-text'` (precedência) |
| CA4 | `IMAGE_ONLY_PDF` | `err('scanned-unsupported')` |
| CA5 | `BOMB_PDF` | `err('decompression-limit-exceeded')` propagado |
| CA5 | `XXE_ATTACK` (XML DOCTYPE) | rejeitado, sem vazar `/etc/passwd` |

## Saída literal RED

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../document-reader/create-document-reader.ts'
ℹ tests 1 · pass 0 · fail 1
```

Causa raiz esperada: `createDocumentReader` não existe (`create-document-reader.ts` é o W1). Sem regressão.

## Contrato a implementar no W1

`createDocumentReader(): DocumentReaderPort = createCascadeReader({ xml: createXmlDocumentReader(), native: createNativePdfDocumentReader() })`. Próximo: **W1** (`ports-and-adapters`).
