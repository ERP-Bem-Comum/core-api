# W3 — Gate de qualidade · FIN-READER-LINE-RECONSTRUCT (#388 2b)

**Skill:** `ts-quality-checker` · **Outcome:** GREEN

| Comando | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✓ |
| `pnpm run format:check` | ✓ |
| `pnpm run lint` | ✓ |
| `pnpm test` | ✓ **3763 pass · 0 fail** · 19 skipped |

Suíte do reader **21/21**. Validação real (local, sem PII): `NFS-e 8` e `NFSE_FILU` passam de
`malformed-document` → classificam `NFS-e`. Extração de campos de **layout tabular** dos reais = follow-up
(issue). Sem regressão global.
