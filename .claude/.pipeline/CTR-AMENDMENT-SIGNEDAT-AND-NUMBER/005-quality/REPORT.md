# 005 — W3 (quality gate) — CTR-AMENDMENT-SIGNEDAT-AND-NUMBER

| Gate | Comando | Resultado |
| --- | --- | --- |
| Typecheck | `pnpm run typecheck` | ✅ sem erros |
| Format | `pnpm run format:check` | ✅ Prettier clean |
| Lint | `pnpm run lint` | ✅ sem erros |
| Test (unit) | `pnpm test` | ✅ **2685 pass / 0 fail / 19 skipped** (2704 total) |
| Integração | `pnpm run test:integration` (MySQL real) | ✅ **91/91** (rodado no W1; ver nota) |

## Nota sobre integração

A integração completa (`test:integration`, 91/91) foi executada no W1 contra MySQL 8 real — cobrindo a
migration `0012` (signed_at + CHECK + ctr_amendment_seq), o novo `nextAmendmentNumber` per-contract, e o
round-trip de `signedAt` na suíte de Amendment. O único código alterado depois disso foi o fix do W2 em
`cli/state.ts isValidAmendment` (validador do **driver memory**, state file) + `state.test.ts` — **zero
efeito no caminho MySQL** (mapper/seq-tables inalterados). Logo o resultado 91/91 permanece válido sem
re-execução do gate Docker.

## Conclusão

W3 GREEN. Ticket pronto para `close`. Card-pai `CTR-CONTRACT-METADATA-E-ADITIVOS` permanece em `todo/`
(G1 — metadados do contrato — pendente).
