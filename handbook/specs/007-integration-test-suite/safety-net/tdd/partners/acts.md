# TDD — partners / acts (rede de segurança 1:1)

> Fonte read-only: `api-collections/partners/acts/*.bru`. Um caso por request.
> Asserções literais do bloco `tests {}`. Sem asserção → `**smoke-only**`.

## acts/01-export-csv.bru (seq 60)

- **Método + rota:** GET `{{baseUrl}}/api/v1/acts/export`
- **Auth:** bearer `{{operatorToken}}`
- **Pré-condições:** operador com permissão `act:read` autenticado.
- **Asserções:**
  - `res.getStatus()` é `200`.
  - `res.getHeader("content-type")` inclui `"text/csv"`.
  - `res.getHeader("content-disposition")` inclui `"attachment"` e `".csv"`.
  - `res.getHeader("x-content-type-options")` é `"nosniff"`.

## acts/02-export-csv-403.bru (seq 61)

- **Método + rota:** GET `{{baseUrl}}/api/v1/acts/export`
- **Auth:** bearer `{{bareUserToken}}`
- **Pré-condições:** usuário pelado sem `act:read` autenticado.
- **Asserções:**
  - `res.getStatus()` é `403`.
