# W0 — Teste RED · FIN-READER-MULTIFONT-CMAP (#388 2c)

**Skill:** `tdd-strategist` · **Outcome:** RED

## Fixture
`MULTI_FONT_TYPE0` (`buildMultiFontIdentityHPdf`): 2 fontes Type0/Identity-H, CMaps `/ToUnicode` separados,
**GIDs disjuntos** (F1 mostra `NOTA FISCAL DE`; F2 mostra `SERVICOS NFS-e` + `Valor Total: R$ 400,00`).

## Research (medição no DANFCOM real)
3 CMaps · 129 entradas · 74 únicos · **0 colisões** → o merge é seguro (decidiu a arquitetura).

## Evidência RED
Hoje o `readNative` usa só o 1º CMap → decodifica apenas a fonte 1 → `NOTA FISCAL DE` (âncora
incompleta) → `detectType` não casa → `err('malformed-document')` (o `assert ok=true` falha).
