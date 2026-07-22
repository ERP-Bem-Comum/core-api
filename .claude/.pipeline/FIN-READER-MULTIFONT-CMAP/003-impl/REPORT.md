# W1 — Implementação GREEN · FIN-READER-MULTIFONT-CMAP (#388 2c)

**Agente:** `nodejs-runtime-expert` · **Outcome:** GREEN (22/22 reader)

## Mudança (`native-pdf.ts`)
- Nova `mergeToUnicode(cmaps)`: mescla os `bfchar` de todos os streams `beginbfchar` num único mapa.
- `readNative`: `inflated.find(beginbfchar)` (1º CMap) → `inflated.filter(beginbfchar)` + `mergeToUnicode`.

Merge de 1 CMap = comportamento anterior (sem regressão em Identity-H de fonte única). Merge de N CMaps
com códigos disjuntos → todas as fontes decodificam.

## Evidência
- Suíte reader **22/22** (Fatia 1 + 2a + 2b + o novo `MULTI_FONT_TYPE0`).
- Validação real (local, sem PII): `DANFCOM` e `DANFCOM (1)` passam de `malformed-document` → classificam `DANFE`.
- Campos (número/valor) do DANFCOM em layout tabular → `#396`.
