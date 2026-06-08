# TDD — partners / health-check de raiz (rede de segurança 1:1)

> Fonte read-only: `api-collections/partners/health-check.bru`. Um caso por request.
> Asserções literais do bloco `tests {}`. Sem asserção → `**smoke-only**`.

## health-check.bru (seq 1)

- **Método + rota:** GET `{{baseUrl}}/health`
- **Auth:** none
- **Pré-condições:** servidor da API iniciado.
- **Asserções:**
  - `test("CA1 — server esta no ar (200)")`: `res.getStatus()` é `200`.
