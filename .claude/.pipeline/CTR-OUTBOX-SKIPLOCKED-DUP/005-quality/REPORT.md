# W3 — Gate de qualidade

> Outcome: **GREEN** — typecheck + lint + format:check + test todos verdes.
> Única falha em `pnpm test` é pré-existente e fora de escopo (`CTR-INFRA-READONLY-BI-GRANT`).

Inclui os 3 ajustes pós-aprovação solicitados pelo humano (ver `004-code-review/REVIEW.md`
§"Adendo pós-aprovação"): erro de query movido ao port (quebra do ciclo), ORDER BY alinhado
ao ADR-0015 + índice composto, e guard de `throw` no delivery.

## Comandos

### `pnpm run typecheck`

```
tsc --noEmit
```
✅ zero erros.

### `pnpm run lint`

```
eslint .
```
✅ zero erros. (W1 havia deixado 6 erros não capturados — `prefer-readonly-parameter-types`
no param `handler` de `withPendingBatch` em InMemory/Drizzle, e `promise-function-async` nas
3 ops do batch Drizzle. Corrigidos: `eslint-disable-next-line` no `handler` (espelhando o
tipo já existente) e `async` nas ops.)

### `pnpm run format:check`

```
prettier --check .
All matched files use Prettier code style!
```
✅ verde.

### `pnpm test` (unit)

✅ todos verdes **exceto** `CA-5: readonly_bi consegue SELECT`
(`tests/infra/mysql-compose.test.ts`) — falha pré-existente já catalogada em
`CTR-INFRA-READONLY-BI-GRANT` (login `Access denied` do user `readonly_bi`), sem relação
com outbox.

### Integração (MySQL real via Docker)

- `outbox-worker.integration.test.ts` — CA-I1, CA-I2, CA-I3 verdes, **3× estável** (CA-I2 é
  o coração do ticket).
- `outbox-repository.drizzle.test.ts` — **17/17 verde** (inclui CA-3 ordenação de
  `findPendingForUpdate` e CA-7 SKIP LOCKED com conjuntos disjuntos em 2 conexões).

## Conclusão

Critérios de aceitação do `000-request.md` satisfeitos:
- **CA1:** `CA-I2` verde estável (3×). ✅
- **CA2:** 2 workers concorrentes entregam cada mensagem exatamente uma vez. ✅
- **CA3:** causa-raiz documentada (W0: claim em autocommit) e corrigida (W1: claim +
  delivery + markProcessed na mesma transação). ✅
