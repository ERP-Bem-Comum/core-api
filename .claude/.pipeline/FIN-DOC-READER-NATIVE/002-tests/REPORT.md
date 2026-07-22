# W0 — RED — FIN-DOC-READER-NATIVE

Wave W0 (fail-first). Skill: **`tdd-strategist`** + agente **`nodejs-runtime-expert`** (zlib/bytes). Módulo `financial`, feature 034 (reader PDF nativo), ADR-0050. Testes + builder de fixtures RED — nenhum `src/` de produção tocado.

## Builder de PDF sintético (a peça central) — `_fixtures/pdf-builder.ts`

Monta PDFs **classic-xref + content-stream FlateDecode** byte-a-byte, determinísticos, dados fiscais **falsos**, sem PII. **Validado empiricamente** (round-trip inflado, não suposição):

- `buildNativePdf(lines)` — WinAnsi (CA1/CA2). Validado: `%PDF-1.4` + `xref` + `%%EOF`; o stream infla de volta ao content `BT … (texto) Tj … ET`.
- `buildIdentityHPdf(lines)` — **Type0/Identity-H** (CA3): o content mostra só códigos 2-byte `<0001…>` (garbling), e o CMap `/ToUnicode` mapeia `<0001>→U+0056 (V)`, `<0002>→U+0065 (e)`… — **validado que o texto NÃO aparece no content raw**, só via ToUnicode. Prova que o CA3 é significativo.
- `buildEncryptedPdf` (`/Encrypt`), `buildObjStmPdf` (`/ObjStm`), `buildBombPdf(N)` (infla N bytes), `buildImageOnlyPdf` (sem `Tj`) — variantes CA4/CA5/CA6.

## Testes RED — `native-pdf.test.ts` (CA1–CA7)

| CA | Documento | Assere |
| :-- | :-- | :-- |
| CA1 | NFS-e nativa WinAnsi | `type='NFS-e'`, número, competência, supplier, `grossValue=100000`, ISS `Retention` VO; `resolvedVia='native-text'` |
| CA2 | RPA nativa | `grossValue` + 3 retenções (INSS/IRRF/ISS); **bruto − Σret = líquido** (76500) |
| CA3 | Boleto Identity-H | `grossValue=123456` extraído via `/ToUnicode` (sem garbling) |
| CA4 | `/Encrypt`, `/ObjStm` | `err('unsupported-pdf-structure')` |
| CA5 | bomba (12 MiB) | `err('decompression-limit-exceeded')` |
| CA6 | só-imagem | `err('scanned-unsupported')` |
| CA7 | vazio / lixo | `err('empty-input')` / `err('malformed-document')` |

## Saída literal RED

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../adapters/document-reader/native-pdf.ts'
ℹ tests 1 · pass 0 · fail 1
```

Causa raiz esperada: `createNativePdfDocumentReader` não existe (`native-pdf.ts` + `pdf-lowlevel.ts` são o W1). Sem regressão.

## Contrato a implementar no W1 (transparente)

`createNativePdfDocumentReader(): DocumentReaderPort` sobre `pdf-lowlevel.ts` (guarda de estrutura → `unsupported-pdf-structure`; inflate guardado com `maxOutputLength` → `decompression-limit-exceeded`; tokenizer `Tj`/`TJ`; CMap `/ToUnicode`) + estruturação por tipo (âncoras/regex, parser de dinheiro **BR** `1.000,00`→cents). Próximo: **W1** (`ports-and-adapters` + `nodejs-runtime-expert`). Gate de escape: `unpdf` se `/ToUnicode` in-house se mostrar intratável.
