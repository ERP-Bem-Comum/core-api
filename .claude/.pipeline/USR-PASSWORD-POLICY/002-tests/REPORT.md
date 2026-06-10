# W0 — Testes RED

**Ticket:** USR-PASSWORD-POLICY · **Wave:** W0 · **Outcome:** RED

## Arquivos
- `tests/modules/auth/domain/credential/password-policy.test.ts` (atualizado p/ MIN=12)
- `tests/modules/auth/adapters/http/password-policy-endpoint.route.test.ts` (novo)

## Evidência

```
password-policy.test.ts: fail 2
  ✖ CA2: 11 chars -> password-too-short   (hoje MIN=8 deixa passar → RED)
  ✖ CA3b: comum <12 -> too-short          (hoje bate na blocklist → too-common → RED)
password-policy-endpoint.route.test.ts: pass 1 / fail 1
  ✖ CA4: GET /api/v2/auth/password-policy -> 200   (hoje 404 → RED)
```

RED legítimo: a política ainda é MIN=8 e o endpoint não existe. GREEN no W1.
