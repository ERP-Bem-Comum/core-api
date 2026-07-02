# W0 — RED (fail-first invertido) — AUTH-FORGOT-RESET-RATELIMIT-TESTS

**Skills:** test-pyramid-engineer + tdd-strategist (via contratos-orchestrator; REPORT persistido pela sessão principal) · **Data:** 2026-07-02

## Objetivo da wave

Fechar o gap de cobertura apontado pela auditoria de e-mail (fastify-server-expert, 2026-07-02): `/forgot-password` e `/reset-password` usam o MESMO `sensitiveRateLimit` de `/login` e `/refresh` (plugin.ts:197,211), mas não tinham trava de regressão. Como o comportamento já existe, os testes **nascem GREEN**; a disciplina RED se cumpre via **prova de valor por mutação** (CA4), sem tocar `src/`.

## Skills usadas

- `test-pyramid-engineer` — camada: teste de **borda HTTP via `fastify.inject`** (unit de adapter, sem I/O real, driver `memory`), mesma camada dos casos login/refresh. App in-memory por `it` (baldes de rate-limit isolados por instância).
- `tdd-strategist` — casos derivados 1:1 dos CA1/CA2/CA3; mutação como prova (equivalente ao RED).

## Arquivos tocados

- `tests/modules/auth/adapters/http/rate-limit.test.ts` (estendido; +1 describe, +3 it, reusa helper `makeApp(max)`). `src/` intacto.
- Throwaway `_ca4-mutation-proof.throwaway.test.ts`: criado, rodado, **deletado** (só evidência CA4).

## Mapa casos × critérios de aceite

| Caso (it) | CA | Asserção-chave |
| --- | --- | --- |
| forgot-password excedendo o limite dedicado -> 429 | CA1 | `max` primeiras = 202; (max+1)-ésima = 429 |
| reset-password excedendo o limite dedicado -> 429 | CA2 | `max` primeiras ≠ 429 (400 reset-token-invalid); (max+1) = 429 |
| esgotar /forgot-password NAO bloqueia /login nem /reset-password | CA3 | após esgotar forgot, /login ≠ 429 e /reset-password ≠ 429 |
| prova de valor por mutação (abaixo) | CA4 | sob mutação, 429 vira 202/400 → asserção falha |
| suíte completa sem regressão | CA5 | `pnpm test` 3368 tests / 0 fail (≥ 3365) |

## Fundamento de CA3 (baldes independentes)

`@fastify/rate-limit@10.3.0`: rota com `config.rateLimit` recebe `store.child(...)`, que instancia um `LocalStore` novo (LRU próprio) por rota (`store/LocalStore.js:44`). Logo as 4 rotas sensíveis têm baldes independentes.

## Evidência GREEN (arquivo isolado)

    ▶ AUTH-FORGOT-RESET-RATELIMIT-TESTS (BE-REC-003 rate-limit)
      ✔ forgot-password excedendo o limite dedicado -> 429
      ✔ reset-password excedendo o limite dedicado -> 429
      ✔ esgotar /forgot-password NAO bloqueia /login nem /reset-password (baldes por rota)
    tests 6 · pass 6 · fail 0

## Evidência CA4 (prova de valor por mutação — descartada)

Harness throwaway montou a app com `sensitiveRateLimit: { max: 1000, timeWindow: '1 minute' }` (equivale a "sem proteção dedicada" na janela do teste; o teto global 200/min não dispara em 4 requisições). As asserções de 429 FALHAM:

    ✖ forgot-password: (max+1)-esima nao e 429 quando o teto sensivel e removido — actual: 202, expected: 429
    ✖ reset-password: (max+1)-esima nao e 429 quando o teto sensivel e removido — actual: 400, expected: 429
    tests 2 · pass 0 · fail 2

Sem o `sensitiveRateLimit`, forgot cai no 202 (anti-enumeração) e reset no 400 (reset-token-invalid) — nunca 429. Os testes têm valor de regressão real. Throwaway deletado; o arquivo committed contém só os testes verdes.

## Gate desta wave (saídas literais)

- Arquivo isolado: `tests 6 / pass 6 / fail 0`.
- `pnpm test` completo: `tests 3368 / suites 991 / pass 3350 / fail 0 / skipped 18` (≥ 3365 ✓, +3 do ticket).
- `pnpm run lint`: 0 erros. `prettier --check` no arquivo: OK.

## Próximo passo

W1 (no-op documentado — `src/` intacto) → W2 (code-reviewer, identificadores EN um a um) → W3 (herda a ressalva dos 2 erros ETL alheios dos tickets-irmãos).
