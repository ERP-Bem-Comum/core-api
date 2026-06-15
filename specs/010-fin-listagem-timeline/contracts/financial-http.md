# Contrato HTTP: Financeiro — Fatia 2 (`/api/v2/financial`)

**Feature**: `specs/010-fin-listagem-timeline/`. Roteamento: `fastify-server-expert` (rotas/Zod) + `bruno-api-client-expert`
(coleção `.bru` E2E). Estende o contrato da fatia 1 (`009/contracts/financial-http.md`) — **não** redefine as rotas de
escrita; apenas (a) materializa as rotas de leitura #6 e #8 (eram stub/ausente) e (b) ativa o `409` de optimistic lock.

## Rotas tocadas nesta fatia

| #   | Método | Rota                           | Mudança na fatia 2                                      | Perm                    | Sucesso |
| --- | ------ | ------------------------------ | ------------------------------------------------------- | ----------------------- | ------- |
| 6   | GET    | `/documents`                   | **listagem real** (era stub vazio): filtros + paginação | `fiscal-document:read`  | 200     |
| 8   | GET    | `/documents/:id/timeline`      | **nova**: trilha por-campo (Time Travel)                | `fiscal-document:read`  | 200     |
| 2   | PATCH  | `/documents/:id`               | passa a **enforçar** `version` → `409` em conflito      | `fiscal-document:write` | 200     |
| 3   | POST   | `/documents/:id/approve`       | passa a **enforçar** `version` → `409` em conflito      | `payable:approve`       | 200     |
| 4   | POST   | `/documents/:id/undo-approval` | passa a **enforçar** `version` → `409` em conflito      | `payable:approve`       | 200     |

> Rotas 1/5/7 (POST create, DELETE cancel, GET :id detalhe) inalteradas no contrato — mas todas as mutações passam a
> gravar a trilha (transparente ao cliente).

## 6. `GET /documents` — listagem paginada (real)

```ts
// Query (Zod) — já definido em schemas.ts da fatia 1 (listDocumentsQuerySchema); agora efetivamente aplicado
const ListQuery = z.object({
  status: z.enum(['Draft', 'Open', 'Approved']).optional(),
  supplierRef: z.uuid().optional(),
  type: z.string().optional(),
  dueFrom: z.iso.date().optional(),
  dueTo: z.iso.date().optional(), // janela inclusiva
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Response 200
const DocumentListResponse = z.object({
  items: z.array(DocumentSummary), // id, status, documentNumber, type, supplierRef, netValueCents(nullable), dueDate(nullable)
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(), // contagem com os filtros aplicados (não a página)
});
```

- Filtros combináveis (AND). Janela `dueFrom..dueTo` inclusiva; invertida → `items: []`. Nenhum resultado → `200` com
  `items: []`, `total: 0` (não erro). `supplierRef` não-UUID → `400` (Zod).

## 8. `GET /documents/:id/timeline` — trilha por-campo

```ts
// Response 200
const Timeline = z.object({
  entries: z.array(
    z.object({
      eventType: z.string(), // DocumentSaved | PayableApproved | ApprovalUndone | DocumentCancelled | DocumentDraftSaved
      target: z.object({ kind: z.enum(['Document', 'Payable']), id: z.uuid() }),
      occurredAt: z.string().datetime(),
      actor: z.uuid().nullable(),
      changes: z.array(
        z.object({
          field: z.string(),
          before: z.string().nullable(),
          after: z.string().nullable(),
        }),
      ),
    }),
  ),
});
```

- Ordenação cronológica (`occurredAt` asc). Documento inexistente → `404`. Sem `fiscal-document:read` → `403`.

## Optimistic lock (rotas 2/3/4) — `409`

```ts
// Body já tem `version` (fatia 1); agora propagado ao use case.
// PATCH: AdjustDocumentBody { version, ...campos }   approve/undo: ApproveBody { version }
```

- Versão do cliente desatualizada → **`409`** com `{ error: { code: 'document-version-conflict', ... } }`. O cliente deve
  re-buscar o documento (versão atual) e reenviar. Mutação **não** aplicada em conflito.

## Status codes (delta da fatia 2)

| Código | Quando                                      | Erro de domínio             |
| ------ | ------------------------------------------- | --------------------------- |
| 400    | filtro com ref malformada / query inválida  | (Zod)                       |
| 403    | sem `fiscal-document:read` (lista/timeline) | —                           |
| 404    | timeline de documento inexistente           | `document-not-found`        |
| 409    | conflito de versão em ajuste/aprovação/undo | `document-version-conflict` |

## E2E (Bruno)

Coleção `bruno/financial/`: criar N docs variados → listar com cada filtro + paginar (verificar `total`/recorte); GET
timeline após criar→ajustar→aprovar→undo (verificar `changes` e ordem); PATCH com `version` velho → `409`. `bru run
--reporter junit` no CI. Validação interna complementar via `fastify.inject`.
