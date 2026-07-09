# FIN-READER-TOUNI-GUARD — Guarda de faixa no `parseToUnicode` (#389)

**Issue:** #389 · **Épico:** OCR #62 (Fatia 2, trilha reader) · **Size:** S
**Módulo:** `financial/adapters/document-reader`

## Problema

`parseToUnicode` (`native-pdf.ts`) chama `String.fromCodePoint(Number.parseInt(hex, 16))` sobre o
valor do `bfchar` do CMap `/ToUnicode`. Um CMap hostil com codepoint fora da faixa Unicode
(> `0x10FFFF`), ex. `<0041> <FFFFFF>`, lança **`RangeError: Invalid code point`** não capturado, que
atravessa `parseToUnicode → readNative → read()` — violando a regra de camada "adapters nunca vazam
`Error` para application/domain" (`.claude/rules/adapters.md`) e o contrato `Result` do
`DocumentReaderPort`. **CWE-248** (Uncaught Exception). Pré-existente (achado do security-backend-expert
no W2 do #386; fora daquele diff).

## Critério de aceite (Dado/Quando/Então)

- **Dado** um PDF com CMap `/ToUnicode` cujo `bfchar` mapeia para codepoint > `0x10FFFF`,
  **Quando** `reader.read()` roda, **Então** retorna `err(...)` (mapeamento inválido ignorado) —
  **sem lançar** exceção através da borda do port.

## Fix

Guarda de faixa em `parseToUnicode`: `cp > 0x10FFFF → continue` (ignora o mapeamento; o `?? ''` do
`decodeHex` já trata o código sem entrada). Fail-closed, coerente com o resto do arquivo.

## DoD

W0 RED (fixture sintético CMap hostil) → W1 GREEN → W2 (security-backend-expert) → W3 verde.
