# Code Review — CTR-LIST-BY-CONTRACTOR (#116) — Round 1

**Veredito:** APPROVED · **Data:** 2026-06-19

**Escopo:** filtro `contractorId`/`contractorType` no listPaged + exposição do ref no list-item + índice + testes.

## Princípio IX

`contractor` é referência **por identidade** entre agregados (Vernon, *Implementing DDD*, p.460) — o `ContractorRef` (type+id) vive no agregado Contract, sem snapshot. Expor o **ref leve** (não o `ContractorView` rico) mantém o list-item barato (sem composição cross-módulo / N+1) e respeita o boundary: o front filtra/exibe por id; o snapshot rico continua só no detalhe.

## Issues

- 🔴 nenhuma. Filtro no read-side (repo); `ContractorId` branded validado na borda (Zod uuid) → brand seguro pós-validação; sem cross-module import (o ref é do próprio módulo). Migration ADD INDEX não-quebrante.
- 🟡 nenhuma.
- 🔵 Decisões: (a) **expor o ref, não o rich block** no list — evita N+1 (resolver snapshot de N contratantes) e é o que o front precisa p/ filtrar. (b) Índice composto `(contractor_id, status)` — o caso de uso é "vigentes (`Active`) do fornecedor". (c) Entregues AS DUAS opções do issue (filtro server-side + ref no item) — front escolhe.

## O que está bom

- Mínima superfície: o `Contract` já tinha `contractor`; só faltava expor + filtrar.
- Fixture `buildContract` ganhou `contractorId`/`contractorType` (reusável); teste de filtro cobre os 2 adapters via repo.
- Sem regressão (3011 pass / 0 fail); teste de DTO deepEqual atualizado (não mascarado).

**APPROVED** → W3.
