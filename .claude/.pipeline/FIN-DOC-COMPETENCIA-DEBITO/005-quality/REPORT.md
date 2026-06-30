# W3 — Gate (ALL-GREEN) · FIN-DOC-COMPETENCIA-DEBITO (#197)

| Gate | Resultado |
| --- | --- |
| `pnpm run typecheck` | ✅ 0 erros |
| `pnpm run format:check` | ✅ |
| `pnpm run lint` | ✅ |
| `pnpm test` (unit) | ✅ 0 fail · 18 skipped |
| `pnpm run test:integration:financial` (Docker) | ✅ 0 fail (migration 0023 competencia) |

## DoD (#197)

- [x] decisões registradas (R-1a VO Competencia; R-1b contaDebitoRef→fin_cedente_accounts by-identity).
- [x] create aceita `competencia`/`contaDebitoRef`; persistem; validações 422.
- [x] expostos no **detalhe** (`GET /documents/:id`); migration 0023.
- [~] exposição na **listagem** — follow-up registrado (detalhe completo).
- [ ] **issue #197 fechada** — pendente de commit → PR → merge.

Ticket **closed-green**.
