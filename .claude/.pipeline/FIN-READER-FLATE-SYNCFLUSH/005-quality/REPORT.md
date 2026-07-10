# W3 — Gate de qualidade · FIN-READER-FLATE-SYNCFLUSH (#388 2a)

**Skill:** `ts-quality-checker` · **Outcome:** GREEN

| Comando | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✓ |
| `pnpm run format:check` | ✓ |
| `pnpm run lint` | ✓ |
| `pnpm test` | ✓ 3781 tests · **3762 pass · 0 fail** · 19 skipped |

Suíte do reader: **20/20** (17 Fatia 1 + `SHORT`/`ZERO`/`TRUNCATED`). Validação real (local, sem PII):
`NFSE_FILU` classifica `type=NFS-e` (era `malformed-document`). Sem regressão global. Follow-ups de
segurança do W2 (F2 CWE-436, F3 CWE-354, F4/F5 cobertura) registrados em issue de hardening.
