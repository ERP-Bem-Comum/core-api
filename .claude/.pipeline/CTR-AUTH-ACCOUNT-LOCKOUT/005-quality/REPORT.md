# W3 — Quality Gate

Sob pnpm 11.5.0.

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ limpo |
| `pnpm run lint` | ✅ limpo (corrigido `promise-function-async` no InMemory store) |
| `pnpm run format:check` | ✅ Prettier OK |
| testes auth (`tests/modules/auth/**`) | ✅ 207 pass / 0 fail (+7) |

Integração MySQL não exercida (store é in-memory; persistência real é follow-up). Comportamento
coberto por testes de domínio puro + use case in-memory.
