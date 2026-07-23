# CTR-OBJECTIVE-TEXT — escopo (#530)

> Size **S**. Coluna `objective varchar(1000)` estoura com objeto longo → insert rejeitado pelo MySQL →
> front recebe "tente novamente" genérico. Fix: `objective` → `text`.

## Problema (#530)
- `src/modules/contracts/adapters/persistence/schemas/mysql.ts:65` — `objective: varchar('objective', { length: 1000 })`.
- Domínio (`contract.ts:63`) só valida `isBlank(objective)` — **sem cap de tamanho**. Logo, objeto >1000
  chars passa no domínio e é **rejeitado pelo MySQL** no insert (`Data too long for column 'objective'`).
- `objective` **não** participa de nenhum índice (busca é LIKE) → troca para `text` é segura, sem prefixo.

## Escopo (in)
1. `objective: varchar('objective', { length: 1000 })` → `objective: text('objective').notNull()`.
2. Gerar migration (`pnpm run db:generate`) — `MODIFY objective TEXT NOT NULL`.

## Fora de escopo
- Cap de tamanho no domínio — não há requisito de limite; o legado aceitava objeto longo.
- Migrar dado histórico — `text` acomoda o que `varchar(1000)` já guardava (sem perda).

## Critérios de aceite
- **CA1** `contracts.objective.getSQLType() === 'text'` (era `varchar(1000)`).
- **CA2** Coluna segue `NOT NULL` (a validação de obrigatório do domínio continua íntegra).
- **CA3** Migration gerada com `MODIFY`/`ALTER` de `objective` para `TEXT NOT NULL`.
- **CA4** Regressão zero: `pnpm test` verde.

## Pipeline
| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — `getSQLType()` deve ser `text` (CA1/CA2) |
| W1 | `drizzle-schema-author` | `text` + `db:generate` |
| W3 | `ts-quality-checker` | gate |
