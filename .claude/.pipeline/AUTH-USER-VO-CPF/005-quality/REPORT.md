# W3 — Gate de Qualidade — AUTH-USER-VO-CPF

**Wave:** W3 · **Outcome:** GREEN · **Data:** 2026-06-07

Gate completo executado na branch `005-gestao-usuarios`:

| Comando | Resultado |
|---------|-----------|
| `pnpm run typecheck` (`tsc --noEmit`) | ✅ exit 0 |
| `pnpm run format:check` (`prettier --check .`) | ✅ "All matched files use Prettier code style!" |
| `pnpm run lint` (`eslint .`) | ✅ exit 0 |
| `pnpm test` (`node:test`) | ✅ **2278 pass / 0 fail** · 17 skipped (integração atrás de opt-in) · 727 suites |

Nenhuma regressão. Política de regressão zero satisfeita — todo o gate verde.

## Entregue

- `src/modules/auth/domain/identity/cpf.ts` — VO `Cpf`.
- `tests/modules/auth/domain/identity/cpf.test.ts` — 9 testes (CA1..CA6).

Ticket pronto para `close`. Próximo da Foundational da 005: `AUTH-USER-VO-TELEPHONE` (T005/T009).
