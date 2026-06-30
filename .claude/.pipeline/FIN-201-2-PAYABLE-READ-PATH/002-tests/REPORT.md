# W0 — Testes RED · FIN-201-2-PAYABLE-READ-PATH (#221)

**Outcome:** RED · **Data:** 2026-06-22

**Teste:** `tests/.../mappers/payable-list.mapper.test.ts` (no-Docker).

Casos: linha do PAI (kind Parent, retentionType null) e do FILHO (kind Child + retentionType) →
`PayableListItem`; `kind`/`status` inválidos do banco → `Result` de erro.

**RED confirmado:** `ERR_MODULE_NOT_FOUND` — `payable-list.mapper.ts` (e o tipo `PayableListItem`) ainda
não existiam. Falha por inexistência da API.
