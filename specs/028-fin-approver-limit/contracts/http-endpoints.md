# Contract — borda HTTP (Fastify + Zod, ADR-0027)

## Auth — gestão da alçada do papel (US2)

Campo **aditivo e opcional** nos endpoints de papel existentes.

### `POST /api/v1/roles` (criar papel) / `PATCH /api/v1/roles/:id` (atualizar)

Request — `roles-schemas.ts` (adição):

```ts
approvalLimitCents: z.number().int().min(0).nullable().optional();
// ausente/null = papel sem alçada (não aprova — FR-008)
```

Response: representação do papel passa a incluir `approvalLimitCents: number | null`.

- Permissão: a já existente para gestão de papéis (sem permissão nova).
- Validação de borda: inteiro ≥ 0; overflow tratado pelo `z.number().int()` + bounds de `BIGINT`.

## Financial — validação no documento (US1/US3)

**Sem rota nova.** A validação incide em:

| Endpoint existente                          | Quando valida                           |
| ------------------------------------------- | --------------------------------------- |
| `POST /api/v1/financial/documents` (create) | se há `approverRef` + líquido calculado |
| transição `submitDraft` (Draft→Open, #91)   | ao calcular o líquido na submissão      |

### Mapeamento de erro → HTTP (sem vazar interno — FR-006)

| Erro de domínio                     | HTTP    | Mensagem PT (dicionário da borda)                             |
| ----------------------------------- | ------- | ------------------------------------------------------------- |
| `approver-not-found`                | 422/400 | "Aprovador não encontrado."                                   |
| `approver-missing-permission`       | 422/400 | "O usuário indicado não pode aprovar pagamentos."             |
| `approver-limit-exceeded`           | 422/400 | "Alçada do aprovador insuficiente para o valor do documento." |
| `no-approver-with-sufficient-limit` | 422/400 | "Nenhum aprovador com alçada suficiente para o valor."        |

- Status code exato (400 vs 422) decidido no ticket conforme o padrão já usado pela borda do financial (alinhar com erros de validação de documento existentes). Nenhum identificador/código interno no body (padrão #52).
