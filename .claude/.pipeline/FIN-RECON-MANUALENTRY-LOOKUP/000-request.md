# FIN-RECON-MANUALENTRY-LOOKUP — Request (#191)

**Size:** S · **Tipo:** bug fix (1 linha) · **Issue:** #191 · **Módulo:** financial

## Problema

`GET /api/v2/financial/statement-transactions/:id/reconciliation` (lookup da conciliação ativa, #175)
retorna **503** quando a conciliação ativa da transação é do tipo `ManualEntry` (criada via
`POST /statement-transactions/:id/manual-entry`).

Causa-raiz isolada: o rehydrator de persistência `toType` (`reconciliation.mapper.ts:34-35`) aceita só
`Individual | Multiple | Partial` → para uma linha com `type='ManualEntry'`, `toType` devolve `null` →
`toDomain` retorna `err('invalid-reconciliation-type')` → `findActiveByTransaction` loga e devolve
`reconciliation-repository-failure` → a borda HTTP mapeia para **503**.

Inconsistência: o domínio `ReconciliationType` **já inclui** `'ManualEntry'` (`domain/reconciliation/types.ts:9`)
e o `transactionReconciliationResponseSchema` **já declara** o enum com `ManualEntry`. Só o mapper de
persistência ficou para trás.

## Correção

Incluir `'ManualEntry'` em `toType`. 1 linha — nenhuma mudança de domínio nem de schema.

## Critérios de aceite

- **CA1**: `toDomain` de uma conciliação `ManualEntry` (round-trip `reconciliationToRow → toDomain`) retorna
  `ok` com `type === 'ManualEntry'` — hoje `err('invalid-reconciliation-type')` (RED).
- **CA2**: zero regressão na suíte; gate W3 verde (typecheck/format/lint/test).

## Não-objetivos

Reidratar o boundary `manualEntry` (fin_manual_entries) dentro do `toDomain` — segue `null` (o undo não o
lê; nenhum use-case desta fatia precisa). Fora de escopo.
