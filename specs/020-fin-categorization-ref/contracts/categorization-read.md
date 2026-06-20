# Contracts (Phase 1) — leitura das listas de referência

Borda `/api/v2/financial/*` · Zod contract-first (ADR-0027) · perm RBAC de leitura (confirmar slug em tasks: `financial:read` vs `reconciliation:read`). Todas read-only; inativos omitidos; ordenação determinística.

## GET /api/v2/financial/categories

- **Query**: nenhuma (v1). (futuro: `?group=` para filtrar).
- **200 response**:
  ```
  z.array(z.object({
    id: z.uuid(),
    name: z.string(),
    group: z.enum(['despesa', 'receita', 'ajuste']),
  }))
  ```
- Ordenado por `(group, name)`. Lista vazia → `[]` (FR-007).

## GET /api/v2/financial/cost-centers

- **200 response**:
  ```
  z.array(z.object({
    id: z.uuid(),
    code: z.string(),
    name: z.string(),
  }))
  ```
- Ordenado por `code`.

## GET /api/v2/financial/programs _(opcional — US3 P2)_

- **200 response**:
  ```
  z.array(z.object({ id: z.uuid(), name: z.string() }))
  ```
- **Passthrough** do `ProgramReadPort` (programs/public-api). Decidir em tasks se entra agora ou vira follow-up (o front já lista via `programs` direto).

## Erros

- Reader indisponível → `503` (mapear `*-read-unavailable`).
- Sem permissão → `403`.

## Notas de implementação (para tasks)

- Mappers row→DTO retornam só `{id,name,(group|code)}` — nunca o row cru (ADR-0006/0014).
- O `group` no DB é varchar+CHECK; o cast para a union é seguro pós-CHECK (padrão do statement #120/#159).
