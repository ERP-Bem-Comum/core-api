# FIN-PAYABLE-PAIDAT-CHECK — CHECK `status='Paid' ⇒ paid_at NOT NULL` (#383)

**Issue:** #383 · **Follow-up:** FIN-MATCH-PAIDAT (#272) · **Size:** S
**Módulo:** `financial/adapters/persistence`

## Problema

`fin_payables.paid_at` é nullable no schema, mas a regra de negócio garante que todo payable
`status='Paid'` tem `paid_at` preenchido. O invariante existe só no domínio, não no banco — uma linha
inconsistente vinda de ETL/UPDATE manual não seria rejeitada. **Não é bug ativo** (`payPayableManually`
seta `status`+`paidAt` atomicamente; a reversão de conciliação preserva o `paid_at`). É **hardening**
(defesa em profundidade, skill `drizzle-schema-author` §"Defesa em profundidade nos `check`").

## Critérios de aceite (Dado/Quando/Então)

1. **Dado** um UPDATE que grave `status='Paid'` com `paid_at=NULL`, **Quando** persistir, **Então** o
   MySQL rejeita (violação de CHECK — errno 3819).
2. **Dado** `status='Open'` com `paid_at=NULL`, **Quando** persistir, **Então** aceito (CHECK só vincula em Paid).
3. **Dado** `status='Paid'` com `paid_at` preenchido, **Quando** persistir, **Então** aceito.

## Solução

`ALTER TABLE fin_payables ADD CONSTRAINT fin_payables_paid_at_chk CHECK (status <> 'Paid' OR paid_at IS NOT NULL)`
(migration `0033_ambiguous_xavin.sql`). ADR-0020: `CHECK` é feature permitida (`handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md:87`).

## ⚠️ Nota de deploy (pré-voo obrigatório)

`ADD CONSTRAINT CHECK` **valida as linhas existentes** ao aplicar. Se algum ambiente (x99/QA/prod)
tiver linha legada `status='Paid'` com `paid_at IS NULL` (a coluna foi adicionada nullable e sem
backfill em `0021`), o `ALTER` falha com errno 3819. Antes de aplicar `0033` em cada ambiente:

```sql
SELECT id, status, paid_at FROM fin_payables WHERE status = 'Paid' AND paid_at IS NULL;
```

Deve retornar 0 linhas. Nenhum caminho de escrita atual produz a inconsistência (verificado no W2).

## DoD

W0 (teste integração) → W1 (schema+migration) → W2 (drizzle-orm-expert) → **W3 gate local verde +
validação no x99 (MySQL 8.4 real): RED→GREEN da constraint**.
