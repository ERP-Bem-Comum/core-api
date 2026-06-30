# W0 — Testes RED · FIN-DOC-STATE-EDITS (#165 + #166)

**Agente**: tdd-strategist · **Data**: 2026-06-19 · branch `feat/fin-doc-state-edits`.

Dois ajustes na máquina de estados do agregado `Document` (módulo financial):

| Issue | Teste RED | Como falha |
| --- | --- | --- |
| #166 (DELETE Draft) | `domain/document/cancel.test.ts` (+1 caso) | `Document.cancelDraft` não existe → `not a function` |
| #165 (editar Approved leve) | `domain/document/edit-metadata.test.ts` (novo, 2 casos) | `Document.editMetadata` não existe → `not a function` |

Acceptance HTTP (escritos): `delete-draft.http.test.ts` (#166) e `edit-approved.http.test.ts` (#165) — provam o fluxo ponta-a-ponta após W1.
