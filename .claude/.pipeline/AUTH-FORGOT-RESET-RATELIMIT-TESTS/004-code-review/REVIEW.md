# W2 — REVIEW (code review read-only) — AUTH-FORGOT-RESET-RATELIMIT-TESTS

**Skill:** code-reviewer (via contratos-orchestrator; REVIEW persistido pela sessão principal) · **Modo:** read-only · **Round:** 1/3 · **Data:** 2026-07-02
**Veredito:** ✅ **APPROVED**

## Escopo auditado

- Diff único: `git diff HEAD -- tests/modules/auth/adapters/http/rate-limit.test.ts` (+90 linhas, 1 `describe` + 3 `it`).
- Contexto: `000-request.md`, `002-tests/REPORT.md` (prova por mutação CA4), `003-impl/REPORT.md` (W1 no-op).
- Ticket só-de-cobertura: testes nascem GREEN; disciplina RED cumprida via mutação documentada no W0.

## Checklist × achado

### 1. Idioma identificador-a-identificador (EN) — ✅ PASS

- Variáveis locais novas: `max`, `app`, `payload`, `r`, `blocked`, `login`, `reset`, `i` — todas EN.
- **Nenhum helper novo**: reusa `makeApp`, `EMAIL`, `STRONG` existentes (l.15-24). Zero duplicação.
- Strings de `it()` e mensagens de asserção em PT-ASCII — categoria "string ao humano", permitido; ASCII puro confirmado.
- Nenhum critério "consistência com legado" usado; julgamento por regra de idioma pura.

### 2. Mapa CA1/CA2/CA3 + técnica idêntica ao padrão login/refresh — ✅ PASS

- `it` #1 → CA1; `it` #2 → CA2; `it` #3 → CA3. Cobertura 1:1 com o request.
- Mesmo helper `makeApp(max)` e mesma técnica `fastify.inject` + loop `max`/`(max+1)` dos casos vizinhos.
- **Isolamento real:** cada `it` cria a própria `app` e fecha ao fim; `LocalStore` por instância → baldes não vazam entre `it`s.

### 3. CA2 sem falso-positivo — ✅ PASS

Nas `max` primeiras tentativas: `assert.notEqual(r.statusCode, 429, ...)` — se o limite disparasse desde a 1ª (config errada), o teste falharia imediatamente. A `(max+1)`-ésima exige `429` exato. A prova por mutação do W0 (sob teto removido, a transbordante vira 400, não 429) confirma que o 429 vem genuinamente do `sensitiveRateLimit`, não do handler.

### 4. CA3 — prova de independência real — ✅ PASS

Esgota UMA rota (`/forgot-password`, até a 429) e verifica DUAS outras (`/login` e `/reset-password`, ambas `notEqual(429)`).

### 5. Resíduo throwaway deletado — ✅ PASS

`git status --porcelain tests/` sem `_ca4-mutation-proof*`; working tree contém só os testes verdes.

### 6. Zero mudança em `src/` pelo ticket — ✅ PASS

Diff do ticket toca exclusivamente o arquivo de teste; o diff de `src/` da branch pertence aos tickets-irmãos. W1 no-op confirmado.

## Achados por severidade

- **Blocker / Major / Minor:** nenhum.
- **Nit (sem ação):** o CA2 usa `notEqual(429)` nas primeiras tentativas em vez de `equal(400)` — intencional e correto: espelha o padrão de login/refresh (l.35, l.50) e o CA2 admite qualquer resposta de negócio ≠ 429. Manter preserva a simetria.

## Próximo passo

W3 (ts-quality-checker): 4 comandos do gate. Herda a ressalva dos **2 erros de typecheck ETL alheios** dos tickets-irmãos. Baseline da suíte: `3368 tests / 0 fail` (≥ 3365, +3 do ticket).
