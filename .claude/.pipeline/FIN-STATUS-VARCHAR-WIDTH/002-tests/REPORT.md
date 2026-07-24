# W0 — REPORT (teste RED) · FIN-STATUS-VARCHAR-WIDTH (#519)

> Bug de PRODUÇÃO. Módulo `financial` apenas (ADR-0014). Skill: `tdd-strategist`.
> Proposta ancorada em `.claude/.planning/519-status-width/SOL-519.md` §5.

## Resultado: RED confirmado contra MySQL 8.4.10 real

## Arquivo entregue

`tests/modules/financial/adapters/persistence/payable-status-width.drizzle-mysql.test.ts` (novo, ao lado do
irmão `reconciliation-repository.drizzle-mysql.test.ts`, cujo harness foi copiado). Registrado na suíte
gated `financial` do runner (`scripts/ci/test-integration.ts`, +3 linhas de config — **não** toca `src/`).

## O que o teste cobre (caso → CA)

| # | Caso (`it`) | Tabela / coluna | CA |
| - | --- | --- | --- |
| 1 | `fin_payables.status comporta 'PartiallyReconciled' (19)` | `fin_payables.status` | CA1 · CA2 |
| 2 | `fin_documents.status comporta 'PartiallyReconciled' (19)` | `fin_documents.status` | CA1 · CA2 |

Cada caso: insere linha com status válido curto → `UPDATE ... SET status='PartiallyReconciled'` (19) →
read-back íntegro. **UPDATE direto no adapter** (não via `reconciliation-repository.drizzle.ts`, que engole o
1406 num `err('reconciliation-repository-failure')` genérico) — surface o errno cru e pina a **largura** como
causa. Complementa o CA11 existente, que só cobre conciliação total (`'Reconciled'`=10, cabe em 16 → nunca
pegou o bug).

## PROVA DO RED — MySQL 8.4.10 real (x99, isolado)

Rodado contra um MySQL 8.4.10 dedicado (container isolado no x99, porta 13306, **separado do túnel do
usuário**; removido após a prova). `applyMigrations: true` aplicou 0001–0038 (schema atual `varchar(16)`):

```
MYSQL_INTEGRATION=1 FINANCIAL_DATABASE_URL=…@127.0.0.1:13306/core node --test … payable-status-width…
ℹ tests 2 · pass 0 · fail 2
✖ CA2: fin_payables.status comporta 'PartiallyReconciled' (19) — RED por 1406 hoje
  AssertionError: #519 RED: UPDATE fin_payables.status='PartiallyReconciled' (19 chars) rejeitado
  (errno=1406; esperado 1406/SQLSTATE 22001 — coluna varchar(16) curta). Após widen p/ varchar(24)
  o UPDATE deve suceder.
✖ CA2: fin_documents.status comporta 'PartiallyReconciled' (19) — RED por 1406 hoje  (idem)
```

**RED pelo motivo certo:** o CHECK `*_status_chk` **aceita** 'PartiallyReconciled' (está na lista `IN`); a
única rejeição possível é a largura → **errno 1406 / SQLSTATE 22001** (`Data too long`), lido via a cadeia
`.cause` do `DrizzleQueryError` (memória `drizzle-execute-error-cause-errno`). Não é 3819 (CHECK) nem 1265.
Não é asserção frouxa: passa **somente** se o UPDATE suceder E o read-back devolver o valor íntegro.

## Skip limpo sem o gate (não quebra `pnpm test` puro)

```
env -u MYSQL_INTEGRATION node --test … payable-status-width…
[financial:payable-status-width] MYSQL_INTEGRATION não definido — pulando integração.
ℹ tests 1 · pass 1 · fail 0
```

Nenhuma conexão fora do gate. Estáticos verdes: `typecheck` · `prettier --check` · `eslint` (arquivo novo).
Isolamento (#535): ids únicos por caso + limpeza em `finally` (DELETE do documento → CASCADE nos títulos);
sem resíduo, sem dependência de ordem.

## Premissa que o W1 DEVE honrar

1. **Widen `varchar(16)` → `varchar(24)` nas DUAS colunas** (`schemas/mysql.ts:116` e `:249`). Um caso por
   tabela → widen de só uma deixa o outro RED.
2. **CHECK intacto** (widening não invalida; literais não mudam).
3. **Migration SEM hint de ALGORITHM** (`mysql84-alter-varchar-no-algorithm-hint`: `INPLACE/INSTANT` estoura
   1845 nesta versão; o unhinted cai p/ COPY). Auditar o `0039_*.sql`: só 2× `MODIFY COLUMN`, CHECK não
   re-emitido (ou DROP+ADD idêntico).
4. **Validar o ALTER real no x99** (COPY sob LOCK=SHARED) antes do merge — SOL-519 §2.

## Fora de escopo (ticket próprio)

`contracts.ctr_documents.status varchar(16)` com `'LogicallyDeleted'` = exatos 16 (margem 0; mesma classe,
outro módulo, não quebra hoje). ADR-0014.
