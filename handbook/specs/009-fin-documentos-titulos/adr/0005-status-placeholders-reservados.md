# ADR-0005 (feature 009): Enum de status completo com estados reservados (sem transição na Fatia 1)

**Status**: Proposed

**Data**: 2026-06-15

**Feature**: `specs/009-fin-documentos-titulos/`

**Decisores**: Gabriel (P.O./arquiteto) + agente Financeiro

## Contexto

A máquina de estados completa do título tem **7 status** (`titulos-liquidacao.md:124-141`): `Rascunho`, `Aberto`,
`Aprovado`, `Transmitido`, `Recusado`, `Pago`, `Conciliado`. A Fatia 1 implementa apenas `Draft` → `Open` → `Approved`
(+ desfazer aprovação, cancelamento). Os demais dependem de Integração Bancária e Conciliação (fatias futuras). FR-016.

## Decisão

`DocumentStatus` declara os **7 valores** desde já (`Draft|Open|Approved|Transmitted|Refused|Paid|Reconciled`), mas
**apenas `Draft`/`Open`/`Approved` têm tipos refinados e funções de transição** nesta fatia. `Transmitted`/`Refused`/
`Paid`/`Reconciled` são **reservados** — válidos no enum/coluna, sem transição alcançável (rejeitadas pelo domínio).

## Citação canônica _(obrigatória — princípio IX)_

> "Every object has a life cycle. An object is born, it likely goes through various states, and it eventually dies—being
> either archived or deleted... But other objects have longer lives... They have complex interdependencies with other
> objects. They go through changes of state to which invariants apply. Managing these objects presents challenges that
> can easily derail an attempt at MODEL-DRIVEN DESIGN."
> — _(ddd--evans-livro-azul.md:1409 — Life Cycle of a Domain Object; Eric Evans, *Domain-Driven Design*)_

## Alternativas consideradas

- **Enum só com os 3 status ativos** — rejeitada: adicionar estados depois mudaria o tipo e a coluna, exigindo migration
  de dados/CHECK a cada fatia.
- **Implementar os 7 estados já** — rejeitada: fora de escopo; sem regras de banco/conciliação não há como definir as
  transições corretamente.

## Consequências

- **Positivas**: enum/coluna estáveis — fatias futuras adicionam transições sem migration de tipo; contrato de borda
  já comporta os 7 valores.
- **Negativas / trade-offs**: estados temporariamente inalcançáveis (documentado); testes devem garantir que transições
  para reservados são rejeitadas na Fatia 1.
- **Impacto em BCs / outbox / migrations**: a coluna de status (ou CHECK) já contempla os 7 valores desde a 1ª migration.
