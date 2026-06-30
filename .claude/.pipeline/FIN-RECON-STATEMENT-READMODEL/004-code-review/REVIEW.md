# Code Review — FIN-RECON-STATEMENT-READMODEL (#139) — Round 1

**Veredito:** APPROVED · **Data:** 2026-06-19

**Escopo:** `domain/statement/statement-view.ts`, `application/use-cases/get-account-statement.ts`, borda HTTP (schemas/dto/plugin/composition) + testes.

## Princípio IX — citação canônica

O `statement-view` é um **read-model para a UI**, materializado como **query no read-time** (não como projeção armazenada): o running balance depende do intervalo `from/to` da consulta, então pré-projetar é inviável. Ancorado em:

> *"Read Model Projections... are frequently used to expose information to various clients (such as desktop and Web user interfaces)."* — Vaughn Vernon, *Implementing DDD*, p. 712.
>
> *"CQRS... responsibilities for reads and writes are instead handled by separate models."* — Sam Newman, *Building Microservices*, p. 537.

**Relação com ADR-0022:** sem conflito. O ADR-0022 governa read-models **armazenados** (projeções idempotentes sobre o outbox, reconstruíveis). O statement-view não é armazenado — é uma **consulta derivada do read-time** sobre `fin_statement_transactions` + saldo de abertura. Não há write-path nem projeção a manter.

## Issues

- 🔴 nenhuma. Domínio puro (sem throw/class/any); `buildStatementView` não falha (sem Result); usa `.toSorted` (imutável) + acumulador local (idiomático, como `projection.ts`). Use-case factory `(deps)=>(input)`; ports via `Pick`. HTTP só leitura.
- 🟡 nenhuma.
- 🔵 Decisões documentadas: (a) running balance e contadores sobre o período inteiro (independem do filtro); o filtro só seleciona linhas exibidas. (b) subtotais do dia sobre o dia COMPLETO (valores reais), `lines` filtradas. (c) `to` estendido ao fim do dia (UTC) na borda p/ intervalo inclusivo.

## O que está bom

- Fail-first em 3 camadas (domínio RED→GREEN é o coração financeiro — running balance verificado).
- `valueCents` absoluto + sinal por `movement` (confirmado nos parsers) → balance correto.
- Reusa `listTransactionsByPeriod` (#125) e o saldo de abertura do cedente (#138) — zero infra nova.
- Sem regressão (suíte 2985 pass / 0 fail).

**APPROVED** → W3.
