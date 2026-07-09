# W1 — GREEN — FIN-DOC-READER-CASCADE

Wave W1. Skill: **`ports-and-adapters`**. Módulo `financial`, feature 034 (fecho da cascata), ADR-0050.

## Entregue

`adapters/document-reader/create-document-reader.ts` — `createDocumentReader(): DocumentReaderPort` compõe a cascata nativo-first com os readers reais:
```ts
createCascadeReader({ xml: createXmlDocumentReader(), native: createNativePdfDocumentReader() })
```
Ponto único de montagem do motor (consumido pela fatia 2). 15 linhas, sem lógica nova — a orquestração já vive em `cascade.ts` (endurecida no NATIVE).

## Integração ponta-a-ponta (5 CAs, readers reais)

```
✔ CA1  XML de NFS-e → resolvedVia='xml'
✔ CA2/CA3 PDF nativo → XML falha → nativo resolve → resolvedVia='native-text' (precedência)
✔ CA4  PDF escaneado → err('scanned-unsupported')
✔ CA5  bomba (PDF) → err('decompression-limit-exceeded') propagado
✔ CA5  XXE (XML DOCTYPE) → rejeitado, sem vazamento
ℹ pass 5 · fail 0
```

## Gates parciais
```
node --test create-document-reader.test.ts → 5 pass / 0 fail
pnpm run typecheck                          → exit 0
eslint                                      → 0 errors
```

Próximo: **W2** (audit — composição/precedência/propagação) via `code-reviewer`.
