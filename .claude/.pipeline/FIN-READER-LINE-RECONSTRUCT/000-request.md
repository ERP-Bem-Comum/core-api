# FIN-READER-LINE-RECONSTRUCT — Fatia 2b: reconstrução de linha (#388)

**Issue:** #388 (sub-fatia 2b) · **Spec:** `035-fin-reader-deep-extract` · **Size:** M
**Módulo:** `financial/adapters/document-reader` · **Alvo:** `NFS-e 8` (+ classificação do `NFSE_FILU`)

## Problema

`extractText` faz `flushLine()` em **todo** operador de posição (`Td/TD/T*/Tm`). PDFs reais fragmentam
word-level (1 `Td` por `Tj`). Efeitos: (a) token hifenizado `NFS-e` vira `NFS- e` após o colapso de
whitespace → `detectType /NFS-e/` não casa; (b) rótulo e valor de campos **lineares** ficam em linhas
separadas → os regexes `[^:\n]` não atravessam o `\n`.

## Solução

- `extractText`: captura `lastNum` (o ty do `Td`); `Td/TD` com `|ty| < 0.01` → **mesma linha** (separa
  palavras com espaço, preserva token hifenizado); `ty ≠ 0` / `T*` / `Tm` → nova linha.
- `structure`/`normalized`: `.replace(/-\s+/g, '-')` cola o token quando o hífen fica seguido de espaço.

## Critérios de aceite

- **CA-2b (token hifenizado):** `Td` ty≈0 entre `NFS-` e `e` → reconstrói mesma linha + normalização de
  hífen → `detectType` casa.
- **CA-campo-linear:** rótulo `:` valor fragmentado por `Td` ty≈0 → mesma linha → regex de campo casa.
- **CA-classificação-real:** `NFS-e 8` e `NFSE_FILU` (hoje `malformed`) → classificam `NFS-e`.
- **CA-regressão:** Fatia 1 (17) + 2a (3) permanecem verdes.

## Escopo (limite descoberto na validação real)

A 2b entrega **classificação robusta** dos reais + extração de campos **lineares** (fixture). Os campos
dos PDFs reais (`NFS-e 8` = **DANFSe v1.0**; `NFSE_FILU`) usam **layout tabular** (rótulo e valor em
colunas distintas, **sem `:`**) — extração tabular por associação espacial é **follow-up** (issue própria),
fora do escopo da reconstrução de linha.

## DoD

W0 RED → W1 → W2 → W3 verde. Suíte do reader **21/21**.
