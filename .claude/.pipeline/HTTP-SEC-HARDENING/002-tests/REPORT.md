# W0 — Testes RED · HTTP-SEC-HARDENING

**Agente:** tdd-strategist · **Outcome:** RED

## Suítes

- `tests/shared/http/sec-hardening.test.ts` — F3 (CA1/CA2) + F4 (CA3/CA3b/CA4)
- `tests/modules/auth/adapters/http/users-write-rate-limit.test.ts` — F5 (CA5)

## RED verificado

```
sec-hardening:   tests 5 · pass 2 · fail 3  (CA1, CA3, CA3b falham; CA2/CA4 ja corretos)
rate-limit:      tests 1 · pass 0 · fail 1  (CA5 falha)
```

- CA1 (F3): 5xx ainda espelha `invite-mail-failed` no body — deve virar `internal`.
- CA3/CA3b (F4): `x-request-id` gigante/com newline ainda refletido — deve ser rejeitado.
- CA5 (F5): POST sem rate-limit por rota não atinge 429 em 31 tentativas.
- CA2/CA4 já passam (comportamento correto a preservar: 4xx mantém code; id válido refletido).
