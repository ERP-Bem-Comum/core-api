# FIN-READER-TABULAR-FIELDS — Fallback `unpdf` p/ campos tabulares (#396)

**Issue:** #396 (T1) · **Spec:** `035` · **Size:** L · **Módulo:** `financial/adapters/document-reader`

## Problema
Os PDFs fiscais reais (DANFSe v1.0, NFS-e SP) têm **layout tabular**: rótulos e valores em colunas/linhas
distintas, sem `:`. Os regexes de campo lineares in-house não casam → o tipo classifica (2a/2b/2c) mas os
campos (número/valor) não extraem.

## Decisão de arquitetura (ADR-0050)
`ADR-0050:40/54`: *"in-house no principal; `unpdf` (MIT) entra só se o in-house não bater a métrica."* O
in-house não bate a métrica nos tabulares → fallback `unpdf`. O `unpdf` (pdf.js serverless) lineariza o
texto na **ordem de leitura** (rótulo e valor adjacentes) — validado por POC → a MESMA `structureText()`
casa os campos por regex linear.

## Solução
- `types.ts`: `resolvedVia` += `'unpdf'`. `native-pdf.ts`: `structure` → `structureText(text, resolvedVia)` exportado.
- `unpdf-reader.ts` (novo): `extractText(unpdf)` → `structureText`. Adapter (exceção do pdf.js → `Result`).
- `cascade.ts`: degrau `fallback` (XML → nativo → **unpdf** → scanned); critério `hasFields` (nativo
  classifica sem campos → aciona o unpdf).
- Regexes **conservadores** para rótulos reais inequívocos (SP `= R$`, `Valor a Pagar`).

## Escopo entregue vs. follow-up
**Entregue:** mecanismo do fallback + campos **parciais** (tipo + ≥1 campo por doc real; antes `malformed`).
**Follow-up:** extração **completa** (número E valor para todos os layouts) requer curadoria de regexes por
layout **com o gabarito da P.O.** (validação de acurácia = invariante #62). Sinalizado no código.

## DoD
W0→W3 verde. Suíte reader 23/23 + cascade 10/10 + unpdf-reader 3/3. Validação real local (sem PII).
