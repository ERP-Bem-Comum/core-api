# W0 — RED (FIN-DOC-READER-PDF-REAL / #386)

**Skill:** tdd-strategist · **Outcome:** RED

## Reprodução (local, 7 PDFs reais gitignored)
`createNativePdfDocumentReader().read()` → DANFCOM ×2 `scanned-unsupported` (TJ=112/Tj=0); DamISS/NFSE_FILU/NF-e `malformed-document`; relatorio-2 OK parcial. (script diagnóstico no scratchpad, não commitado)

## Testes (synthetic, commitados — sem PII)
`_fixtures/pdf-fixtures.ts` + `native-pdf.test.ts`:
- **CA1** `TJ_ARRAY_NFSE` — content com operador **`TJ`** (array) → deve extrair+classificar. Hoje: `scanned-unsupported`.
- **CA2** `FRAGMENTED_KEYWORD` — "Valor Tot"+"al: R$ 700,00" em 2 `Tj` na mesma linha → reconstrução → gross casa. Hoje: não casa.
- **CA3** `DANFE_NATIVE` — texto "DANFE" → `detectType`='DANFE'. Hoje: `malformed-document`.

## Teste local (CA4, gated) — `native-pdf-real.local.test.ts`
Lê a pasta gitignored; **pula se vazia** (CI). Roda o reader nos 7 reais.

## Prova do RED
- synthetic `#386` → **3/3 fail**.
- reais locais → **6/7 fail** (só relatorio-2 passa hoje).

## Próximo (W1)
`native-pdf.ts`: (1) tokenizer trata `TJ` (extrai strings do array, ignora kerning); (2) reconstrução de linha por `Td/TD/T*/Tm` (mudança de Y = nova linha; runs na mesma linha concatenados); (3) `detectType` cobre DANFE/DANFCOM/NFC-e.
