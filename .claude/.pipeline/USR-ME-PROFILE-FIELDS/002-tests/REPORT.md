# W0 — Testes RED

**Ticket:** USR-ME-PROFILE-FIELDS · **Wave:** W0 · **Outcome:** RED

## Arquivo

`tests/modules/auth/adapters/http/me-profile-email.route.test.ts`

## Evidência (`tests 5 · pass 1 · fail 4`)

```
✖ CA1: meUpdateBodySchema aceita email
✔ CA5: meUpdateBodySchema descarta cpf (imutável no autosserviço)
✖ CA2: PUT /me altera email -> 200; GET /me reflete
✖ CA3: PUT /me com email malformado -> 422
✖ CA4: PUT /me com email de outro usuário -> 409
```

## Leitura

- RED **legítimo** em CA1–CA4: `meUpdateBodySchema` não tem `email`, então o `PUT /me` descarta o campo
  (não atualiza, não valida, não detecta conflito). GREEN no W1 ao incluir `email` no schema + handler.
- **CA5 já passa**: o schema já descarta `cpf` (decisão de imutabilidade no autosserviço já honrada). O
  teste fica como guard de regressão — reprova se alguém adicionar `cpf` ao schema do `/me`.
