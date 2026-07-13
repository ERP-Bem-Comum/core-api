# FIN-DOCREPO-TEST-PAIDAT-CHECK — escopo

> Defeito de **teste** (integração) encontrado na validação x99 do #270. Módulo **`financial`**. Size **S**.

## Contexto
O teste `#204 — status Conciliado derivado em findPaged`
(`tests/modules/financial/adapters/persistence/document-repository.drizzle-mysql.test.ts:291`) promove
títulos a `Paid` via raw-SQL **sem** setar `paid_at`, violando o CHECK `fin_payables_paid_at_chk`
(`(status <> 'Paid') OR (paid_at IS NOT NULL)`, introduzido no #231/#232) → errno 3819
(`ER_CHECK_CONSTRAINT_VIOLATED`). O teste falha em `pnpm run test:integration:financial` no MySQL real.

O **código de produção está correto** (`payPayableManually` seta `paidAt` junto de `status='Paid'`) — o
defeito é exclusivamente no setup raw-SQL do teste, que não acompanhou o CHECK.

## Escopo (in)
Corrigir os 3 pontos do teste que gravam `status='Paid'` sem `paid_at`:
1. `UPDATE fin_payables SET status='Paid'` (idPart) — L317.
2. `INSERT INTO fin_payables (… status='Paid' …)` sem coluna `paid_at` — L320-322.
3. `UPDATE fin_payables SET status='Paid'` (idPaid) — L329.

## Fora de escopo
- Alterar o CHECK constraint ou o schema (o CHECK está correto).
- Tocar código de produção (`src/`) — não há defeito lá.
- O #270 (ticket separado, aguardando).

## Critérios de aceite
- **CA1** `document-repository.drizzle-mysql.test.ts` passa 20/20 no MySQL 8.4 real (x99).
- **CA2** Nenhuma regressão: gate Mac (typecheck/format/lint/test) verde.
- **CA3** `paid_at` gravado é coerente (título Paid tem data de pagamento) — não mascarar com valor absurdo.

## Pipeline (skills por wave)
| Wave | Atividade | Skill |
| :-- | :-- | :-- |
| W0 | RED — reproduzir o teste #204 falhando no MySQL real (errno 3819) | `tdd-strategist` |
| W1 | fix mínimo — `paid_at` nos 3 pontos raw-SQL | `tdd-strategist` |
| W2 | audit read-only (fix fiel, não mascara, respeita o CHECK) | `code-reviewer` |
| W3 | gate — `document-repository.drizzle-mysql` 20/20 @ x99 + gate Mac | `ts-quality-checker` |

## DoD
Teste 20/20 no MySQL real + gate Mac verde. Desbloqueia o fechamento do #270 (`test:integration:financial` limpo).
