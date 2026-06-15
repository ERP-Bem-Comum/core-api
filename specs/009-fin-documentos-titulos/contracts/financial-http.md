# Contrato HTTP: Financeiro — Fatia 1 (`/api/v1/financial`)

**Feature**: `specs/009-fin-documentos-titulos/` · Roteamento: `fastify-server-expert` (rotas/plugin/Zod) + `bruno-api-client-expert` (coleção `.bru` E2E — ADR-0034).

> Borda Fastify + Zod (ADR-0025/0027/0037). Validação na borda → primitivos para os smart constructors do domínio
> (Zod na borda, não no domínio — `ts-domain-modeler` §3.A.5). Toda rota exige permissão (`onRequest`/`preHandler`).
> Money trafega como **string de centavos** (`bigint` não é JSON-safe) ou inteiro seguro — decidir no schema; aqui: `string` decimal de centavos.

## Recursos

Prefixo: `/api/v1/financial`. Autenticação: Bearer (sessão `auth`). Autorização: por permissão (coluna "Perm").

| #   | Método | Rota                           | Ação                                                                  | Perm                     | Sucesso |
| --- | ------ | ------------------------------ | --------------------------------------------------------------------- | ------------------------ | ------- |
| 1   | POST   | `/documents`                   | cria/salva documento → gera pai+filhos (`Open`) ou rascunho (`Draft`) | `fiscal-document:write`  | 201     |
| 2   | PATCH  | `/documents/:id`               | ajusta em `Open` (recalcula líquido/filhos)                           | `fiscal-document:write`  | 200     |
| 3   | POST   | `/documents/:id/approve`       | aprova (herança pai→filhos)                                           | `payable:approve`        | 200     |
| 4   | POST   | `/documents/:id/undo-approval` | `Approved` → `Open`                                                   | `payable:approve`        | 200     |
| 5   | DELETE | `/documents/:id`               | cancela (só `Open`, hard delete)                                      | `fiscal-document:cancel` | 204     |
| 6   | GET    | `/documents`                   | lista paginada + filtros                                              | `fiscal-document:read`   | 200     |
| 7   | GET    | `/documents/:id`               | detalhe (doc + payables + retenções + impostos)                       | `fiscal-document:read`   | 200     |
| 8   | GET    | `/documents/:id/timeline`      | trilha por-campo (Time Travel)                                        | `fiscal-document:read`   | 200     |

## Schemas (Zod — request/response)

### 1. `POST /documents`

```ts
// Request body
const CreateDocumentBody = z.object({
  type: z.enum(['NFS-e', 'DANFE', 'RPA', 'Fatura', 'Boleto', 'Recibo', 'Imposto']),
  documentNumber: z.string().min(1).max(60),
  series: z.string().max(20).optional(),
  supplierRef: z.string().uuid(), // obrigatório
  contractRef: z.string().uuid().optional(),
  budgetPlanRef: z.string().uuid().optional(),
  categoryRef: z.string().uuid().optional(),
  programRef: z.string().uuid().optional(),
  paymentMethod: z.enum([
    'TED',
    'TransferenciaBancaria',
    'PIX',
    'Boleto',
    'CartaoCorporativo',
    'Cambio',
    'GuiaRecolhimento',
    'Outro',
  ]),
  grossValueCents: z.string().regex(/^\d+$/), // string de centavos
  sourceDiscountsCents: z.string().regex(/^\d+$/).default('0'),
  discountsCents: z.string().regex(/^\d+$/).default('0'),
  penaltyCents: z.string().regex(/^\d+$/).default('0'),
  interestCents: z.string().regex(/^\d+$/).default('0'),
  retentions: z
    .array(
      z.object({
        // ISS/IRRF/INSS/CSRF — só NFS-e/RPA
        type: z.enum(['ISS', 'IRRF', 'INSS', 'CSRF']),
        baseCents: z.string().regex(/^\d+$/),
        rateBps: z.number().int().min(0),
        valueCents: z.string().regex(/^\d+$/),
      }),
    )
    .default([]),
  registeredTaxes: z
    .array(
      z.object({
        type: z.enum(['ICMS', 'IPI', 'PIS', 'COFINS', 'CBS', 'IBS_Municipal', 'IBS_Estadual']),
        baseCents: z.string().regex(/^\d+$/),
        rateBps: z.number().int().min(0),
        valueCents: z.string().regex(/^\d+$/),
      }),
    )
    .default([]),
  dueDate: z.string().date().optional(), // obrigatório se !asDraft
  description: z.string().max(500).optional(),
  asDraft: z.boolean().default(false),
});

// Response 201
const DocumentCreated = z.object({
  id: z.string().uuid(),
  status: z.enum(['Draft', 'Open']),
  netValueCents: z.string(),
  payables: z.array(
    z.object({
      id: z.string().uuid(),
      kind: z.enum(['Parent', 'Child']),
      retentionType: z.enum(['ISS', 'IRRF', 'INSS', 'CSRF']).nullable(),
      valueCents: z.string(),
      status: z.string(),
    }),
  ),
});
```

### 2. `PATCH /documents/:id` · 3–4. approve / undo-approval

```ts
const AdjustDocumentBody = CreateDocumentBody.partial().extend({
  version: z.number().int().min(0),
}); // optimistic lock
const ApproveBody = z.object({ version: z.number().int().min(0) });
// Response 200: documento atualizado (mesmo shape de DocumentCreated, com status Open/Approved)
```

### 6. `GET /documents` (lista)

```ts
const ListQuery = z.object({
  status: z.enum(['Draft', 'Open', 'Approved']).optional(),
  supplierRef: z.string().uuid().optional(),
  type: z.string().optional(),
  dueFrom: z.string().date().optional(),
  dueTo: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
// Response 200: { items: DocumentSummary[], page, pageSize, total }
```

### 8. `GET /documents/:id/timeline`

```ts
// Response 200
const Timeline = z.object({
  entries: z.array(
    z.object({
      eventType: z.string(),
      target: z.object({ kind: z.enum(['Document', 'Payable']), id: z.string().uuid() }),
      occurredAt: z.string().datetime(),
      actor: z.string().uuid().nullable(),
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

## Status codes (mapa erro de domínio → HTTP)

| Código    | Quando                                                            | Erro de domínio (exemplo)                                                     |
| --------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 400       | falha de schema Zod / ref com formato inválido                    | `financial-ref-invalid`                                                       |
| 401 / 403 | sem sessão / sem permissão                                        | — (Operador tentando `approve` → 403)                                         |
| 404       | documento inexistente                                             | `document-not-found`                                                          |
| 409       | conflito de versão / transição inválida / cancelar fora de `Open` | `document-version-conflict`, `invalid-state-transition`, `cancel-not-allowed` |
| 422       | regra de negócio                                                  | `net-value-not-positive`, `retention-not-allowed-for-type`                    |

## E2E (Bruno — ADR-0034)

Coleção `bruno/financial/` exercitando a borda: criar NFS-e com retenções → verificar pai+filhos; aprovar como Aprovador
(200) e como Operador (403); cancelar em `Open` (204) e em `Approved` (409); GET timeline com `changes`. `bru run --reporter junit` no CI.
Validação interna complementar via `fastify.inject` (ADR-0037, princípio VII).
