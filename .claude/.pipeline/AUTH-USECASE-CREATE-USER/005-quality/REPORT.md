# W3 — Gate de Qualidade — AUTH-USECASE-CREATE-USER

**Wave:** W3 · **Outcome:** GREEN · **Data:** 2026-06-07

| Comando | Resultado |
|---------|-----------|
| `pnpm run typecheck` | ✅ OK |
| `pnpm run format:check` | ✅ OK |
| `pnpm run lint` | ✅ 0 problemas |
| `pnpm test` | ✅ **2338 pass / 0 fail** · 17 skipped |

Sem regressão (+8). Gate verde.

**US3 — camada domínio+application entregue** (use case + evento + port, design do security-backend-expert).
Próximo: `AUTH-HTTP-CREATE-USER` — adapter `invite-mailer.email`, wiring (gerar `unusablePasswordHash`),
rota `POST /api/v1/users` + Bruno.
