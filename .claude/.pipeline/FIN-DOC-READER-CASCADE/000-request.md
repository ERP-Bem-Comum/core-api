# FIN-DOC-READER-CASCADE — escopo

> Feature **034-fin-documento-reader** (fatia 4, o FECHO). Módulo **`financial`**. Épico **#62**. Size **S**.
> Ancorado em **ADR-0050** (cascata nativo-first). Compõe os readers reais entregues: `FIN-DOC-READER-XML` + `FIN-DOC-READER-NATIVE` sobre a `cascade.ts` (skeleton da fatia 1, já endurecida — erro de recurso terminal, F4/F5).

## Escopo (in)

1. **Factory de composição** `adapters/document-reader/create-document-reader.ts` — `createDocumentReader(): DocumentReaderPort` que injeta os readers reais na cascata:
   ```ts
   createCascadeReader({ xml: createXmlDocumentReader(), native: createNativePdfDocumentReader() })
   ```
   É o ponto único de montagem do motor de leitura (consumido pela fatia 2: borda HTTP + wiring ao `Document`).
2. **Teste de INTEGRAÇÃO ponta-a-ponta** dos 3 readers reais juntos (não fakes) — reusa as fixtures `xml-fixtures.ts` e `pdf-fixtures.ts`.

## Fora de escopo

- Alterar a lógica dos readers (XML/nativo) ou da `cascade.ts` (já entregues/endurecidos).
- Borda HTTP + storage + wiring ao `Document` (fatia 2 de feature).
- Exposição via `public-api` (fatia 2).

## Critérios de aceite (integração, fixtures reais)

- **CA1 — XML resolve por XML.** Dado o XML sintético de NFS-e, `createDocumentReader().read(bytes)` → `resolvedVia='xml'` + campos corretos (o nativo nem é consultado).
- **CA2 — PDF nativo resolve por nativo.** Dado o PDF sintético de NFS-e nativa, → `resolvedVia='native-text'` + campos (o XML falha `malformed-document` e a cascata cai para o nativo).
- **CA3 — precedência.** Um documento reconhecido pelo XML nunca chega ao nativo (short-circuit comprovado).
- **CA4 — escaneado.** PDF só-imagem → `err('scanned-unsupported')`.
- **CA5 — erro de recurso propaga.** Bomba (PDF) → `err('decompression-limit-exceeded')` no nível da cascata (não mascarado); XXE (XML com DOCTYPE) → cascata cai para o nativo, que também rejeita → sem vazamento.

## Pipeline (agentes por wave)

| Wave | Atividade | Especialista |
| :-- | :-- | :-- |
| W0 | RED — teste de integração dos 3 readers reais | skill **`tdd-strategist`** |
| W1 | factory `createDocumentReader` | skill **`ports-and-adapters`** |
| W2 | audit (composição, precedência, propagação de erro) | skill **`code-reviewer`** |
| W3 | gate | skill **`ts-quality-checker`** |

## DoD

Gate W3 verde. `createDocumentReader` compõe XML+nativo na cascata; integração dos 3 reais comprovada (precedência + escaneado + erro de recurso). **Motor de leitura (fatias 1–4) completo** — pronto para a fatia 2 (borda + wiring).
