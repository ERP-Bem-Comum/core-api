# W3 — Quality Gate

Sob pnpm 11.5.0.

| Gate | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✅ limpo |
| `pnpm run lint` | ✅ limpo |
| `pnpm run format:check` | ✅ All matched files use Prettier code style |
| testes auth (`tests/modules/auth/**`) | ✅ 197 pass / 0 fail (+9 novos) |

Integração MySQL (Docker) não exercida nesta sessão — mesma ressalva de porta 3306 ocupada por
container alheio registrada em CTR-PNPM-11-MIGRATION. As mudanças deste ticket são domínio/
application/borda HTTP cobertas por testes in-memory.
