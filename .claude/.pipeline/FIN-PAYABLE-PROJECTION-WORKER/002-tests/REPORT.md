# W0 — RED · FIN-PAYABLE-PROJECTION-WORKER (#307)

Skill: **`tdd-strategist`**.

| CA | Teste | Estado | Motivo |
| :-- | :-- | :-- | :-- |
| CA1 | `tests/workers/payable-view-projection/delivery.test.ts` (rowToMessage + deliver) | ✖ RED | `ERR_MODULE_NOT_FOUND` — `delivery.ts` inexistente |
| CA4 (m2) | `apply-payable-event.test.ts` — snapshot `Reconciled` → mapeado a Paid | ✖ RED | allowlist atual rejeita `Reconciled` |

Reader (CA2) + integração (CA5) validados no W3 via `test:integration:financial` (MySQL real; Docker/CI). W1 implementa: DLQ table + reader Drizzle + worker + wiring + m2.
