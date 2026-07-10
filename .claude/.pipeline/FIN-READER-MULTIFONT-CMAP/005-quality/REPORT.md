# W3 — Gate de qualidade · FIN-READER-MULTIFONT-CMAP (#388 2c)

**Skill:** `ts-quality-checker` · **Outcome:** GREEN

| Comando | Resultado |
| :--- | :--- |
| `pnpm run typecheck` | ✓ |
| `pnpm run format:check` | ✓ |
| `pnpm run lint` | ✓ |
| `pnpm test` | ✓ **3765 pass · 0 fail** · 19 skipped |

Suíte do reader **23/23** (Fatia 1 + 2a + 2b + 2c multi-font + 2c colisão fail-closed). Validação real
(local, sem PII): `DANFCOM` e `DANFCOM (1)` passam de `malformed-document` → classificam `DANFE`. Campos
(layout tabular) = **#396**. Sem regressão global.
