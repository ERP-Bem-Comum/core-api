# W2 — code review (self, read-only) — FIN-RECON-DETAIL-TITLE-CATEGORY (fatia 2)

**Veredito: APPROVED.**

- **Precedência correta**: `categoryRef = manualEntry?.categoryRef ?? (título → resolveTitleCategoryRef)`.
  Lançamento manual continua resolvendo pela fatia 1 (CA3 — não regride).
- **`resolveTitleCategoryRef`**: composition, via `pools.payableDocView.findByPayableIds([payableId])` →
  `categoryRef` (mesmo port do `export-reconciliation-nibo`). Graceful: `!ok` / vazio / null → null.
- **Handler**: usa o **1º item** (`items[0]`) — o modal exibe um título; Multiple usa o primeiro
  (documentado; refino por-item = follow-up). Sem item → null (Partial sem título etc.).
- **Sem mudança de DTO/schema** — o campo `category` já veio da fatia 1. Zero migration.
- Só leitura; nenhum evento. Resolução real via `payableDocView` Drizzle é #500-gated (inject prova o wiring
  com um `payableDocView` in-memory semeado).

Sem Blocker/Major/Minor. 1 round. Empilha sobre a fatia 1 (`feat/recon-detail-manual-category`).
