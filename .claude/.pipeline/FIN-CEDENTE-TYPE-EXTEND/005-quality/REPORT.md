# W3 — Gate de qualidade · FIN-CEDENTE-TYPE-EXTEND (#206)

**Outcome:** ALL-GREEN · **Data:** 2026-06-22

| Gate | Resultado |
| --- | --- |
| `pnpm run typecheck` | ✅ |
| `pnpm run format:check` | ✅ (meta da migration 0019 formatado) |
| `pnpm run lint` | ✅ |
| `pnpm test` | ✅ **3115 / 0 fail** (18 skip; inclui os 3 casos #206 do domínio) |
| `pnpm run test:integration:financial` (Docker) | ✅ **51 / 0 fail** (migration 0019 + cartao/outro + `type_label`) |

Política de regressão zero atendida. 4 waves done (W0 RED · W1 GREEN · W2 APPROVED · W3 ALL-GREEN).
