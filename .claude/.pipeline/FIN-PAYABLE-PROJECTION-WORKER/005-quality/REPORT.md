# W3 — GREEN (gate unitário) · FIN-PAYABLE-PROJECTION-WORKER (#307)

Skill: **`ts-quality-checker`**.

| Comando | Resultado |
| :-- | :-- |
| `pnpm run typecheck` | ✅ verde |
| `pnpm run format:check` | ✅ |
| `pnpm run lint` | ✅ |
| `pnpm test` | ✅ **3309 pass · 0 fail · 18 skipped** · 980 suites |

## Integração no MySQL real — gated (Docker down local)

`test:integration:financial` exige Docker (down nesta sessão). O teste e2e `projection.integration.test.ts` (2 casos: happy path + **DLQ**) roda gated `MYSQL_INTEGRATION` e valida: migrations `0027`/`0028` no banco real, `ON DUPLICATE KEY UPDATE`, claim ordenado, e o caminho `markFailed`/`moveToDeadLetter` (row completa na DLQ + DELETE + not-found→err). Validação empírica em CI/VM x99.

## DoD

Worker `payable-view-projection` consome `fin_outbox` → `fin_payable_view` (FIFO single-instance, DLQ, graceful). DLQ table + reader + wiring + m2 + script + compose + runbook. Gate unitário verde; W2 (2 agentes) endereçado. **Fecha o DoD original do #235** (o read-model agora é alimentado em runtime). Destrava #236 (backfill) + widgets.
