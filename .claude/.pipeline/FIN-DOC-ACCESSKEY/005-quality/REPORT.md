# W3 — Gate (ALL-GREEN) · FIN-DOC-ACCESSKEY (#115)

| Gate | Resultado |
| --- | --- |
| `pnpm run typecheck` | ✅ 0 erros |
| `pnpm run format:check` | ✅ |
| `pnpm run lint` | ✅ |
| `pnpm test` (unit) | ✅ 0 fail · 18 skipped |
| `pnpm run test:integration:financial` (Docker) | ✅ 0 fail (migration 0022 access_key) |

## DoD (#115)

- [x] `accessKey` (44 dígitos, normalizada) no create; obrigatória quando DANFE (não-rascunho).
- [x] erros → `invalid-access-key` / `access-key-required-for-danfe` (422).
- [x] persistida (`fin_documents.access_key`, migration 0022) e exposta no `GET /documents/:id`.
- [ ] **issue #115 fechada** — pendente de commit → PR → merge.

Ticket **closed-green**.
