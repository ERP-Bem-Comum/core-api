# Phase 0 — Research & Decisions · 020-fin-categorization-ref

## D1 — Fonte canônica de Categoria e Centro de custo (a decisão central, ex-needs-decision)

- **Verificado (dev, 2026-06-20)**: zero tabela de referência de categoria/centro de custo em qualquer módulo (`grep mysqlTable('…categor|cost_cent|centro|budget_plan')` = 0). Só **Programa** tem fonte (módulo `programs`, `list-programs.ts`).
- **Decisão (humano): A — financeiro-local.** `fin_categories` e `fin_cost_centers` vivem no módulo financeiro, povoadas por seed/migração. O financeiro **possui e expõe** essas duas listas.
- **Alternativas rejeitadas**:
  - B (Orçamento #113): casa "certa" a longo prazo, mas #113 não existe → bloquearia #142 atrás de uma fatia L. Rejeitada por YAGNI/desbloqueio.
  - C (módulo de referência compartilhado): 5º+ BC → ADR + infra; over-engineering para 2 listas pequenas. Rejeitada.
- **Reversibilidade**: se Categoria/CC virarem dimensões org-wide, migram para um dono compartilhado via novo ADR (os `id` permanecem; só muda a origem). O contrato HTTP do financeiro pode virar passthrough sem quebrar consumidores.

## D2 — Programa: passthrough cross-módulo, sem duplicar

- O `programs` já é a fonte canônica (front usa `listProgramsFn`). O financeiro **não** recria Programa.
- **Decisão**: consumir via **`ProgramReadPort`** (programs/public-api), espelhando o padrão `ContractCategorizationReadPort` (#178): port + drizzle/in-memory store + `buildXReadPort` (read-only) + export no index do `programs`.
- **Sub-decisão (deferir p/ tasks)**: o endpoint `GET /financial/programs` é opcional — se o front já lista via `programs` direto, o financeiro só precisa do read-port internamente (para validar/derivar), e o `GET` proxy entra como follow-up. US3 é P2 justamente por isso.

## D3 — Agrupamento de Categoria (despesa/receita/ajuste)

- O protótipo (§9.4.5) agrupa categorias por natureza. `group` é uma **union EN-fechada** `'despesa' | 'receita' | 'ajuste'`.
- **Decisão**: modelar `group` como VO union no domínio + **varchar + CHECK** no DB (ADR-0020 — sem ENUM nativo), espelhando `movement`/`reconciliation_status` do statement (#120) e o entryType union (#159). O agrupamento (render dos grupos) é do front; o backend devolve `group` por item.

## D4 — Estabilidade referencial + inativação

- Itens de referência ganham `active` (boolean). Listagem de seleção omite inativos (FR-006/007). Registros financeiros guardam o `id` (e label desnormalizado quando o histórico exigir, como #126) → inativar não corrompe histórico.
- **Decisão**: soft-delete via `active` (nunca hard-delete de item referenciado). Sem FK física documento→categoria (referência por identidade, como #160) — validação de existência fica para o use-case que grava, se/quando necessário.

## D5 — Seed inicial

- Sem tela de cadastro nesta fatia (FR-008). Povoamento por **seed idempotente** (migração de dados ou script) com as categorias agrupadas e os centros de custo do protótipo (CC-001 Administrativo, CC-002 Programa Saúde, …).
- **Decisão**: seed determinístico com `id` estáveis (UUIDs fixos) para os itens-base, garantindo SC-002 (mesmo `id` entre ambientes).

## Pendências para o Plan/Tasks

- Confirmar a permissão RBAC exata para a leitura (`financial:read`? `reconciliation:read`? — alinhar com o catálogo do `auth`).
- Decidir se `GET /financial/programs` entra agora (US3) ou vira follow-up.
