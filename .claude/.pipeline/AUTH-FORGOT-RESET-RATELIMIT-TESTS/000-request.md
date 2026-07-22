# AUTH-FORGOT-RESET-RATELIMIT-TESTS — cobertura de rate-limit nas rotas de reset (gap de teste)

## Contexto

Achado da auditoria de e-mail (avaliação do `fastify-server-expert`, 2026-07-02): `tests/modules/auth/adapters/http/rate-limit.test.ts` cobre o rate-limit sensível de `/login` (l.27-41) e `/refresh` (l.43-55), mas **não** de `/forgot-password` e `/reset-password` — que usam o MESMO `sensitiveRateLimit` (`plugin.ts:197,211`). O comportamento existe e foi indiretamente observado em produção pelo Q.A.; falta a trava de regressão. Relevante porque essas rotas alimentam o envio de e-mail (flood da #133 é contido hoje só por esse limite por IP).

## Natureza do ticket (fail-first invertido — ticket só-de-cobertura)

Não há API nova: os testes devem **nascer GREEN** contra o comportamento existente. A disciplina W0-RED se aplica na forma de **prova de valor por mutação**: o W0 deve demonstrar que cada teste novo FALHARIA se a proteção não existisse (ex.: montar a app de teste com uma config sem o `rateLimit` da rota, rodar, capturar a falha, e registrar a evidência no REPORT — sem tocar `src/`). W1 é no-op documentado (zero mudança em `src/`).

## Escopo

1. Estender `tests/modules/auth/adapters/http/rate-limit.test.ts` (mesmo padrão dos casos de login/refresh): `/forgot-password` e `/reset-password` → `max` tentativas aceitas, a `(max+1)`-ésima responde **429**; baldes independentes por rota (esgotar `/forgot-password` não bloqueia `/reset-password` nem `/login`).
2. Nada além: sem teto por destinatário (#133, decisão pendente do humano), sem tocar `src/`, sem integração.

## Critérios de aceite

- CA1 — **Dado** a app com `sensitiveRateLimit` default, **Quando** `/forgot-password` recebe `max+1` POSTs do mesmo IP na janela, **Então** as `max` primeiras respondem 202 e a seguinte **429**.
- CA2 — Idem para `/reset-password` (respostas de negócio podem ser 400 `reset-token-invalid`; o que importa é a `(max+1)`-ésima ser 429).
- CA3 — **Dado** o balde de `/forgot-password` esgotado, **Quando** `/login` (ou `/reset-password`) recebe uma requisição, **Então** NÃO está bloqueada (contadores por rota independentes).
- CA4 (prova de valor) — evidência registrada no REPORT de que cada teste falharia sem a proteção (mutação no harness de teste, não em `src/`).
- CA5 — Suíte completa sem regressão (contagem ≥ baseline 3365).

## Processo (regras duras da worktree)

- Waves despachadas pelo harness; identificadores novos EN (auditoria um a um no W2); sem Docker/integration; baseline do typecheck (2 erros ETL alheios) segue documentado — W3 herda a mesma ressalva/condição de fechamento dos tickets-irmãos.
