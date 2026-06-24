# FIN-STATEMENT-VARCHAR-BOUNDS — trunca bounds varchar no statement.mapper

**Feature:** [025-fin-go-live-1-nucleo](../../../specs/025-fin-go-live-1-nucleo/) · **US2** · **Size:** S
**🎯 Goal:** fechar a issue **[#161](https://github.com/ERP-Bem-Comum/core-api/issues/161)**.

## Contexto

`transactionsToRows` (`statement.mapper.ts:57`) copia `payeeName`/`memo` do parser direto para a row, sem bound. Um extrato real com `memo` > 500 ou `payee_name` > 255 faz o INSERT falhar (`ER_DATA_TOO_LONG`) e a importação inteira retorna `bank-statement-repository-failure`.

## 📋 Definition of Done (critérios de aceite da #161 — fonte da verdade)

- [ ] **CA1** — `memo` de 600 chars → `transactionsToRows` produz `memo` truncado em **500**; `save` ok, sem 5xx.
- [ ] **CA2** — `payee_name` de 300 chars → truncado a **255**. *(Nota: a issue cita `entry_type` 40→32, mas o schema real é `entry_type varchar(16)` e **enum fechado** #159 — validado por `EntryType.rehydrate`; não há texto livre a truncar. Aplica-se truncamento defensivo uniforme a 16; CA2 fica coberto via `payee_name`.)*
- [ ] **CA3** — falha real de infra no INSERT → ainda `err('bank-statement-repository-failure')` (truncamento não mascara erro genuíno; comportamento do repo inalterado).
- [ ] gate **W3** verde; **issue #161 fechada**.

## Escopo técnico

- Helper `truncate(value, max)` no mapper; aplicar a `entryType` (16), `payeeName` (255), `memo` (500) em `transactionsToRows`, com constantes que espelham `schemas/mysql.ts:589-591`.
- Bounds reais do schema: `entry_type` 16 · `payee_name` 255 · `memo` 500.
