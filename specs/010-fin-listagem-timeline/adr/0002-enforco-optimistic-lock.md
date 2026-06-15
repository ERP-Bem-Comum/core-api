# ADR-0002 (feature 010): Enforço de optimistic lock na borda financeira (`version` → 409)

**Status**: Proposed

**Data**: 2026-06-15

**Feature**: `specs/010-fin-listagem-timeline/`

**Decisores**: Gabriel (P.O./arquiteto) + agente Financeiro

## Contexto

A fatia 1 expôs `version` nos schemas de `PATCH /documents/:id`, `approve` e `undo-approval`, e o contrato
(`financial-http.md` §status codes) anuncia `409 document-version-conflict`. Mas a borda **descarta** o `version` e os use
cases não o recebem — a proteção de concorrência depende só do `SELECT FOR UPDATE` interno do repo (que serializa a
escrita, mas **não detecta versão stale do cliente**: last-write-wins). A W2 (security F3 / code-review Issue 1) marcou a
inconsistência contrato↔implementação. O `/speckit-clarify` (FR-009) decidiu **enforçar**.

## Decisão

Os commands `adjustDocument`/`approveDocument`/`undoApproval` passam a receber `expectedVersion`; a borda propaga o
`version` do body. O repo persiste com `UPDATE fin_documents SET ..., version = version + 1 WHERE id = ? AND version = ?`;
`affectedRows = 0` (versão divergente) → erro `document-version-conflict` → **HTTP 409**. O agregado é a **unidade de
controle de concorrência** (o `version` vive em `fin_documents`, raiz do boundary).

## Citação canônica _(princípio IX)_

> "The problem is acute in a system with concurrent access to the same objects by multiple clients. With many users
> consulting and updating different objects in the system, we have to prevent simultaneous changes to interdependent
> objects. Getting the scope wrong has serious consequences."
> — _(ddd--evans-livro-azul.md:1435 — AGGREGATES como escopo de consistência sob concorrência; Eric Evans, _Domain-Driven Design_)_

## Alternativas consideradas

- **Remover `version` do contrato** (last-write-wins) — rejeitada no clarify: o contrato já promete 409; concorrência de
  aprovação/edição com dado obsoleto é risco real (dois aprovadores).
- **Lock pessimista por sessão de edição** (Evans:1494) — rejeitada: borda HTTP stateless; optimistic é idiomático e barato.

## Consequências

- **Positivas**: contrato cumprido; conflito concorrente detectado e reportado (409) sem corromper estado.
- **Negativas / trade-offs**: o cliente (frontend) precisa reenviar com a versão atual após 409 (fluxo de re-fetch).
- **Impacto**: estende o repo Drizzle da fatia 1 (que já incrementa `version`) para comparar com a esperada; sem migration
  (coluna `version` já existe). Atualiza `ApproveDocumentCommand`/`AdjustDocumentCommand`/`UndoApprovalCommand`.
