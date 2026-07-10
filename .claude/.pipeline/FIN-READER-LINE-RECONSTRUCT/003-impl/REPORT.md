# W1 — Implementação GREEN · FIN-READER-LINE-RECONSTRUCT (#388 2b)

**Agente:** `nodejs-runtime-expert` · **Outcome:** GREEN (21/21 reader)

## Research (content stream real do NFS-e 8)
Inspeção confirmou a heurística: `Td` com **ty=0** (a maioria — ex. `39.16,0`, `50.21,0`) = mesmo baseline
(avanço horizontal); `Td` com **ty≠0** (ex. `-72.58,-10.19`) = nova linha. Texto em literais WinAnsi (`hex=0`).

## Mudanças (`native-pdf.ts`)
1. `extractText`: captura `lastNum` (ty do `Td`); `Td/TD` com `|ty|<0.01` → mesma linha (espaço, preserva
   token hifenizado + mantém rótulo/valor lineares juntos); `ty≠0`/`T*`/`Tm` → nova linha.
2. `structure`/`normalized`: `.replace(/-\s+/g, '-')` cola o token hifenizado (só afeta o `detectType`).

## Evidência
- Suíte reader **21/21** (17 Fatia 1 + 3 da 2a + o novo `FRAGMENTED_HYPHEN`) — sem regressão.
- Validação real (local, sem PII): `NFS-e 8` e `NFSE_FILU` passam de `malformed-document` → classificam `NFS-e`.

## Achado (limite → follow-up)
Os campos dos reais estão em **layout tabular** (DANFSe v1.0: "Número da NFS-e" e valor em colunas, sem
`:`) → não extraem por regex linear. Extração tabular = issue própria, fora do escopo da 2b.
