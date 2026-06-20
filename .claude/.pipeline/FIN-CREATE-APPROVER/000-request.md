# FIN-CREATE-APPROVER — `approverRef` opcional no create do documento (#148)

> Épico **Lançar Documento / criação** (#64). Issue **#148** (definir aprovador na inclusão). Decisão (clarify): **Opção 1** — `approverRef` opcional no create + listagem de aprovadores. Size **S**.

## Escopo (in) — financial, aditivo

`approverRef` (UserRef) **opcional** no `createDocument`/`saveDraft`: registra o **aprovador pretendido** junto do documento. A aprovação continua sendo ação separada (`POST /documents/:id/approve`, permissão `payable:approve`) — `approverRef` é só o destinatário pretendido, distinto de `approvedBy` (preenchido na aprovação).

1. Campo `approverRef: UserRef | null` em `DocumentCore` e `DraftDocument`.
2. `Document.create`/`saveDraft`/`submit`/`undoApproval` propagam.
3. `saveDocument`/`saveDraft` aceitam `approverRef?: string | null`, validam via `UserRef.rehydrate`.
4. Schema `fin_documents`: coluna `approver_ref varchar(36)` nullable + **migration 0016**.
5. Mapper row↔domínio (`mapper-invalid-approver-ref`).
6. Borda HTTP: `createDocumentBodySchema` aceita `approverRef`; `documentResponseSchema` + `documentToDto` expõem.

## Critérios de aceite

- **CA1**: `POST /financial/documents` com `approverRef` → 201 e persiste; `GET /:id` ecoa `approverRef`.
- **CA2**: sem `approverRef` → null (back-compat).
- **CA3**: `approverRef` malformado → 400 na borda.

## Fora de escopo (follow-up registrado como issue)

- **Listagem de aprovadores** (`GET /users?permission=payable:approve` ou endpoint dedicado): é trabalho do módulo **auth** (query users→roles→permissions), BC separado — vira issue própria. Front interim: `GET /users` filtrando pelo papel que concede `payable:approve`.

## Gate

W0 RED → W1 GREEN → W2 APPROVED → W3 (`typecheck`+`format:check`+`lint`+`test` verdes).
