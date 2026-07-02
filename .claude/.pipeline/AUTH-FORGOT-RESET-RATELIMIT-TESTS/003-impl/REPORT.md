# W1 — GREEN (no-op documentado) — AUTH-FORGOT-RESET-RATELIMIT-TESTS

**Agente registrado:** test-pyramid-engineer · **Data:** 2026-07-02

## Zero mudança em `src/` — por design

Ticket só-de-cobertura (ver `000-request.md` §"Natureza do ticket"): o comportamento sob teste (rate-limit sensível em `/forgot-password` e `/reset-password`, 429 na `(max+1)`-ésima, baldes por rota) **já existia** em `src/modules/auth/adapters/http/plugin.ts:197,211` + `composition.ts:201`. Não há implementação a fazer.

O GREEN desta wave é o do W0: os 3 testes novos passam contra o código existente (`tests 6 / pass 6 / fail 0` no arquivo; `3368 / 0 fail` na suíte), e o valor de regressão foi provado por mutação (W0 §CA4).

## Prova de disciplina

- `git status` de `src/`: intocado nesta wave (diff da branch em `src/` pertence aos tickets-irmãos `AUTH-EMAIL-LINK-BASE-URLS` e `NOTIF-SMTP-REQUIRETLS`).
- Único arquivo do ticket: `tests/modules/auth/adapters/http/rate-limit.test.ts`.
