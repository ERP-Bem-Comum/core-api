# W0 — Testes RED · FIN-DOC-QUICKWINS

**Wave**: W0 (fail-first) · **Agente**: tdd-strategist · **Data**: 2026-06-19 · Onda 0 do `BACKLOG-GRAPH.md`.

Escopo: 2 quick wins do módulo `financial` (mesma branch — `feat/fin-doc-quickwins`).

| Issue | Teste RED | Como falha |
| --- | --- | --- |
| #154 (RPA aceita ISS) | `tests/.../domain/document/children.test.ts` — invertido o caso "RPA com ISS é rejeitada" → "#154: RPA com ISS é aceita" | `Document.create(RPA + ISS)` retorna `retention-not-allowed-for-type` hoje → `isOk` falha |
| #91 (submitDraft via HTTP) | `tests/.../adapters/http/submit-draft.http.test.ts` (novo) | rota `POST /documents/:id/submit` não existe → 404 (esperava 200/403) |

RED comprovado: #154 `0 pass / 1 fail`; #91 `0 pass / 2 fail`.
