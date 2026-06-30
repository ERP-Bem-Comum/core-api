# Contrato HTTP — `paymentDetail` (feature 027)

Borda Fastify + Zod (ADR-0025/0027). Estende rotas existentes do documento; nenhuma rota nova.

## Schema reutilizado (definir uma vez, referenciar nos 3 pontos)

```ts
// schemas.ts — fragmento de input
const paymentDetailInput = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(/^[^\x00-\x1F\x7F]*$/, 'caracteres de controle não são permitidos');
```

## 1. `POST /api/v1/financial/documents` (create)

**Request** — `createDocumentBodySchema` ganha:

```ts
paymentDetail: paymentDetailInput.optional(),   // ausente = não informado
```

Handler (`plugin.ts`) — bridge para o command:

```ts
paymentDetail: body.paymentDetail ?? null,      // undefined → null (exactOptionalPropertyTypes)
```

| Cenário                 | Status | Resultado                               |
| ----------------------- | ------ | --------------------------------------- |
| `paymentDetail` válido  | 201    | persistido; detalhe retorna idêntico    |
| ausente                 | 201    | documento criado, `paymentDetail: null` |
| `""` / `"   "`          | 400    | rejeitado (`min(1)` após `trim`)        |
| contém `\n`/`\r`/`\x00` | 400    | rejeitado (`regex`)                     |
| > 255 chars             | 400    | rejeitado (`max`)                       |

## 2. `PATCH /api/v1/financial/documents/:id` (adjust)

**Request** — `adjustDocumentBodySchema` ganha:

```ts
paymentDetail: paymentDetailInput.nullable().optional(),  // null apaga; ausente não altera
```

| Cenário                       | Status | Resultado                                 |
| ----------------------------- | ------ | ----------------------------------------- |
| novo valor válido             | 200    | atualiza; timeline registra before/after  |
| `null`                        | 200    | apaga (volta a "não informado"); auditado |
| ausente                       | 200    | sem alteração no campo                    |
| inválido (vazio/control/>255) | 400    | rejeitado                                 |

## 3. `GET /api/v1/financial/documents/:id` (detalhe)

**Response** — `documentResponseSchema` ganha:

```ts
paymentDetail: z.string().nullable(),   // sempre presente no objeto; null = não informado
```

`documentToDto` inclui o campo nos **dois** branches (Draft e Open/Approved). Sob `exactOptionalPropertyTypes`, o campo é obrigatório no DTO (`string | null`), nunca omitido.

## 4. `GET /api/v1/financial/documents` (listagem)

**NÃO alterado.** `documentSummarySchema` não recebe `paymentDetail` (detail-only — BE-030). Garantido por teste: a resposta da lista não contém a chave.

## Backward-compatibility

- Input opcional → clientes atuais seguem válidos.
- Output nullable → documentos pré-feature retornam `paymentDetail: null`.
- Nenhuma mudança em status codes, paginação ou shape de outros campos.
