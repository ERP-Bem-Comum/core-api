# W1 — Implementação (GREEN) · FIN-DOC-QUICKWINS

**Wave**: W1 · **Data**: 2026-06-19

| Issue | Fix | Arquivo |
| --- | --- | --- |
| #154 | `'ISS'` adicionado ao set de retenções permitidas do `RPA` | `domain/document/document.ts:58` (+ comentário em `domain/shared/retention.ts:5`) |
| #91 | Nova rota `POST /api/v2/financial/documents/:id/submit` (perm `fiscal-document:write`) → `deps.submitDraft` (use-case já existia/wired) → `loadAndSerialize` (200) | `adapters/http/plugin.ts` |

GREEN: `children.test.ts` 5/5; `submit-draft.http.test.ts` 2/2.

Notas: #154 é mudança de regra de produto (RPA passa a poder reter ISS) — o teste que codificava a regra antiga foi invertido no W0. #91 espelha o padrão das rotas `approve`/`undo-approval` (mesmo `loadAndSerialize`).
