# W1 — Implementação GREEN (local) · FIN-PAYABLE-PAIDAT-CHECK (#383)

**Skill:** `drizzle-schema-author` · **Outcome:** GREEN (gate local)

## Mudança

`schemas/mysql.ts` — novo `check` no array de constraints de `finPayables`, junto aos demais CHECKs
de defesa em profundidade:

```ts
check('fin_payables_paid_at_chk', sql`${t.status} <> 'Paid' OR ${t.paidAt} IS NOT NULL`),
```

Migration gerada por `pnpm run db:generate:financial` → `0033_ambiguous_xavin.sql`:

```sql
ALTER TABLE `fin_payables` ADD CONSTRAINT `fin_payables_paid_at_chk` CHECK (`fin_payables`.`status` <> 'Paid' OR `fin_payables`.`paid_at` IS NOT NULL);
```

## Gate local

typecheck ✓ · format:check ✓ · lint ✓ · `pnpm test` 3759 pass / 0 fail (o novo teste pula sem
`MYSQL_INTEGRATION`). Sem regressão. **RED→GREEN real pendente de x99.**
