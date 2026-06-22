# FIN-PAYEE-KIND — rastrear o tipo do favorecido (`payeeKind`) no documento (#90)

> Épico **Lançar Documento / criação** (#64). Issue **#90** (favorecido aceitar todos os tipos de parceiro). Size **M**. Decisão (clarify): **aditivo** — mantém `supplierRef`, ADD `payeeKind`.

## Contexto / achados

- `SupplierRef.rehydrate` (partners/public-api/refs.ts:20-22) valida **só formato UUID v4** → o backend **já aceita** qualquer id de parceiro no `supplierRef` e persiste. O gap real não é "aceitar".
- As listagens `GET /suppliers|/financiers|/acts|/collaborators` **já existem** na borda de partners. O "list-fn de Colaborador" faltante é do **front (web-app API client)** — fora do backend.
- Gap real: o documento **não registra QUAL tipo** de parceiro é o favorecido → downstream (pagamento/relatório) trata como Fornecedor. Falta `payeeKind`.

## Escopo (in) — só financial, aditivo não-breaking

1. `PayeeKind = 'supplier' | 'financier' | 'act' | 'collaborator'` + guard `isPayeeKind` (domain/document/types.ts).
2. Campo `payeeKind: PayeeKind` em `DocumentCore` (default `'supplier'`) e `payeeKind: PayeeKind | null` em `DraftDocument`.
3. `Document.create`/`saveDraft`/`submit`/`undoApproval` propagam (create default `'supplier'`).
4. `saveDocument`/`saveDraft` commands aceitam `payeeKind?`; default `'supplier'` quando ausente (back-compat).
5. Schema `fin_documents`: coluna `payee_kind varchar(16)` **nullable** + CHECK; **migration 0015** ADD COLUMN.
6. Mapper: row→domínio (legacy `null` → `'supplier'`; inválido → `mapper-invalid-payee-kind`); domínio→row.
7. Borda HTTP: `createDocumentBodySchema` aceita `payeeKind` (default `'supplier'`); `documentResponseSchema` + `documentToDto` expõem `payeeKind`.

## Critérios de aceite

- **CA1**: `POST /financial/documents` com `payeeKind:'financier'` (+ supplierRef de financiador) → 201 e persiste o kind; `GET /:id` ecoa `payeeKind`.
- **CA2**: `POST` sem `payeeKind` → default `'supplier'` (back-compat).
- **CA3**: documentos pré-existentes (sem `payee_kind`) leem como `'supplier'` (coluna nullable).
- **CA4**: `payeeKind` inválido → 400 na borda.

## Fora de escopo (follow-up)

- `listCollaboratorsFn`/picker multi-parceiro no **front** (web-app) — backend já tem as 4 listagens.
- Resolução de nome/label do favorecido não-fornecedor no grid (read-model multi-kind) — é território #47/#95.

## Gate

W0 RED → W1 GREEN → W2 APPROVED → W3 (`typecheck`+`format:check`+`lint`+`test` verdes).
