# W3 — Gate de qualidade · FIN-PAYABLE-PAIDAT-CHECK (#383)

**Skill:** `ts-quality-checker` · **Outcome:** GREEN (local + x99)

## Gate local
| Comando | Resultado |
|---|---|
| `pnpm run typecheck` | ✓ |
| `pnpm run format:check` | ✓ |
| `pnpm run lint` | ✓ |
| `pnpm test` | ✓ 3759 pass / 0 fail (o teste #383 pula sem `MYSQL_INTEGRATION`) |

## Validação x99 (MySQL 8.4.10 real) — RED→GREEN da constraint
Container docker no x99 (via Tailscale), banco `core` vazio, migrations `0001→0033` aplicadas no boot.

**GREEN (com a constraint `0033`):** 3/3 CAs
- CA1 `UPDATE Paid, paid_at=NULL` → rejeitado (`DrizzleQueryError.cause.errno = 3819`, `ER_CHECK_CONSTRAINT_VIOLATED`)
- CA2 `UPDATE Paid, paid_at=data` → aceito
- CA3 `UPDATE Open, paid_at=NULL` → aceito

**RED (constraint dropada — simula banco sem a `0033`):** CA1 **falha** (`UPDATE Paid+NULL` passa →
`assert.rejects` acusa "missing rejection"); CA2/CA3 verdes. Prova que o teste só passa por causa da constraint.

## Ajuste no W0 (descoberto na validação x99)
O drizzle `db.execute` envolve o erro do mysql2 em `DrizzleQueryError`; o `errno` real fica em
`.cause.errno` (não no topo do objeto). Teste corrigido para extrair de `cause`. (Não afeta código de produção.)

## Nota operacional
Container de teste `paidat-mysql-x99` (porta 3308) não pôde ser removido do x99 (docker-snap:
`permission denied` em container _Up_). Limpeza pendente via `sudo snap restart docker` (reinicia os
demais containers do host — `core-api-mysql-us5`, `fin-ca4-mysql` — fazer quando conveniente).
