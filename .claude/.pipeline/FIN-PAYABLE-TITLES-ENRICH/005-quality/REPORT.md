# W3 — Gate de Qualidade (ALL-GREEN) · FIN-PAYABLE-TITLES-ENRICH (#229)

| Gate | Resultado |
| --- | --- |
| `pnpm run typecheck` | ✅ |
| `pnpm run format:check` | ✅ |
| `pnpm run lint` | ✅ |
| `pnpm test` | ✅ **3146 pass · 0 fail · 18 skipped** |

## DoD (#229)

- [x] `issueDate`, `paymentMethod`, `version`, `grossValueCents`, `netValueCents` no `GET /payable-titles`.
- [x] `dueDate` date-only.
- [x] gate W3 verde; sem regressão (testes de contrato atualizados).
- [ ] **issue #229 fechada** — pendente de commit → PR → merge.

Ticket **closed-green**.
