# W1 — Implementação (GREEN) · FIN-DOC-STATE-EDITS

**Data**: 2026-06-19

## #166 — DELETE de Draft

- Domínio: `cancelDraft(draft: DraftDocument)` → emite `DocumentCancelled` com `payableIds: []` (rascunho não tem filhos). `document.ts`.
- Use-case `cancel-document`: roteia por status — `Draft` → `cancelDraft` (sem payables); `Open` → `cancel` (com payables); `Approved` → `invalid-state-transition` (409).
- A rota DELETE não muda; o hard delete físico segue por `repo.delete(id, version)`.

## #165 — editar dueDate/description de Approved (ajuste leve)

- Domínio: `editMetadata({document: Open|Approved, payables, dueDate?, description?})` → atualiza dueDate/description preservando o **status**, **NÃO regenera** os títulos-filho (preserva ids + status), apenas **propaga o novo dueDate aos payables in-place**. Reusa o evento `DocumentSaved` (sem expandir a union de eventos).
- Use-case `adjust-document`: detecta `hasValueChanges`. Sem mudança de valor (só dueDate/description) → caminho leve, aceito em `Open` E `Approved`. Com mudança de valor → caminho completo (`adjust`, só `Open`, regenera filhos) — bloqueio preservado (Approved + valor → 409).

GREEN: domínio (`cancel`/`edit-metadata`) + acceptance HTTP (`delete-draft`/`edit-approved`) + regressão (`adjust`/`transitions`/`cancel-optimistic-lock`).
