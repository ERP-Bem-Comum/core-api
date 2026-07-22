# W3 — Gate de Qualidade (GREEN) · BGP-SCENARIO-CHILDREN (#401)

**Skill:** ts-quality-checker.

| Gate | Resultado |
| --- | --- |
| `pnpm run typecheck` | ✓ limpo |
| `pnpm run format:check` | ✓ limpo |
| `pnpm run lint` | ✓ limpo |
| `pnpm test` (completo) | ✓ **tests 3885 · pass 3862 · fail 0** · skipped 18 · todo 5 |

- Os 5 `todo` sob "✖ failing tests" são os PDFs Fatia 2 do **#388** (`native-pdf-real.local.test.ts`) — alheios a este ticket, `{ todo }`, não incrementam `fail` nem o exit code.
- +8 testes do #401 (`scenario-children.routes.test.ts`); suíte do módulo 211→219, sem regressão.

## Validação x99
**N/A** — o #401 não altera persistência nem SQL: reusa `listChildren` (drizzle) que já existia e é exercitado por `create-scenery`/`start-calibration`. Não há migration nem query nova para validar no MySQL. O use case novo é orquestração pura, coberto pelos testes de rota (InMemory) + o review W2.

## Veredito
**GREEN.** Ticket pronto para commit + PR (base `dev`).
