# Request — PAR-COLLABORATOR-GRID-GAPS

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: adequação do grid de Colaboradores ao sistema legado. Verificado em 2026-06-08.

> ---
> **🔄 Estado verificado no core-api — 2026-06-15** · revisão pós-handoff (conteúdo abaixo = visão do front em 2026-06-09/14).
>
> - **Já implementado:**
>   - **Filtros do painel (4 dos 6 pedidos):** Escolaridade (`educations`), Raça (`breeds`→`races`), Identidade de Gênero (`genderIdentities`) e Desativado por (`disableBy`) filtram de fato — `src/modules/partners/adapters/http/schemas.ts:35-87` (query Zod) → `src/modules/partners/adapters/http/collaborator-list-query.ts:38-41` (`queryToFilter`) → `src/modules/partners/application/use-cases/list-collaborators.ts:33-36,71-74` (`collaboratorMatchesFilter`). Entregues por `COLLABORATORS-HTTP-LIST-FILTERS-PARITY` (P1c). Os 5 da P1b (`search`, `active`, `status`, `occupationAreas`, `employmentRelationships`) + `roles`/`yearOfContract` também já existiam (`PARTNERS-COLLABORATOR-LIST-FILTERS`).
>   - **Importar CSV:** `POST /api/v1/collaborators/import` (`text/csv` cru) — `src/modules/partners/adapters/http/plugin.ts:301-339`, parser `collaborator-import-dto.ts`, use-case `import-collaborators.ts`. Ticket `PARTNERS-COLLAB-IMPORT-HTTP` (US-001).
>   - **Exportar CSV (cadastral):** `GET /api/v1/collaborators/export` — `src/modules/partners/adapters/http/plugin.ts:152-176`, serializador `src/modules/partners/adapters/export/collaborator-csv.ts`. Ticket `PARTNERS-EXPORT-PARITY-HTTP` (closed-green). Respeita os filtros do grid.
> - **Escopo real restante:**
>   - **Coluna Contratos/Aditivos (contagem):** NÃO existe. Nenhuma contagem é projetada — `CollaboratorReadRecord` (`src/modules/partners/application/ports/collaborator-reader.ts:17-22`) e o DTO (`collaborator-dto.ts`) não trazem o campo; a tabela `par_collaborators` (`src/modules/partners/adapters/persistence/schemas/mysql.ts:146-199`) não tem coluna nem relação. O agregado `Act` é parceiro PJ (CNPJ), sem vínculo a colaborador (`src/modules/partners/domain/act/types.ts`); Contratos referenciam contratado via `ContractorRef`, mas não há projeção de "contagem por colaborador". É o único gap funcional real.
>   - **Filtros Idade e Programa:** **descartados por decisão de produto** (não são "a fazer") — `PARTNERS-COLLAB-FILTERS-DECISION` / FR-012: `programa` não é conceito do BC do colaborador; `idade` é derivável de `birthDate` no client. O contrato não os anuncia e faz strip de chaves desconhecidas (`schemas.ts:21-24`).
> - **Veredito:** PARCIAL (~80% feito) — filtros (exceto os 2 descartados), import e export prontos; falta só a coluna de contagem Contratos/Aditivos.
> ---

## Título
Grid de Colaboradores — filtros e coluna faltantes vs. legado

## Contexto
O grid de Colaboradores foi adequado ao legado (toolbar com filtro/Importar/Adicionar, painel de filtros,
colunas, status duplo, itens-por-página). Alguns elementos do legado **dependem do backend** e ficaram como
gap. O front já consome o que o `ListCollaboratorsInput` oferece.

## Estado atual (verificado)
`ListCollaboratorsInput` (core-api) suporta: `search`, `active`, `status` (registration), `occupationAreas`,
`employmentRelationships`, `roles`, `yearOfContract`, `page`, `limit (5|10|25)`. O item da lista
(`CollaboratorListItem`) traz: `id`, `name`, `email`, `occupationArea`, `role`, `registration`, `activation`.

## Gap (o que falta no backend)
### Filtros do painel (no legado, ausentes no `ListCollaboratorsInput`)
- **Escolaridade**, **Raça**, **Identidade de Gênero**, **Idade** (ou faixa), **Programa**, **Desativado por**.
  → Adicionar como filtros opcionais no input de listagem (+ índices/where no repo).

### Coluna da grade
- **Contratos/Aditivos** — o item da lista não traz contagem de contratos/aditivos do colaborador.
  Hoje exibido como `—` (placeholder). → Incluir a contagem no item da lista.

### Ações (wiring, backend já tem base)
- **Importar CSV/Excel** — botão presente; o backend tem `import-collaborators` (+ `collaboratorRepository.importCsv`),
  mas falta o fluxo de UI (file → CSV → import + resultado). Front follow-up.
- **Exportar** — botão presente; falta confirmar/expor o endpoint de **export CSV** de colaboradores
  (suppliers têm passthrough); então ligar no front.

## Critérios de Aceitação
1. Os filtros Escolaridade/Raça/Identidade de Gênero/Idade/Programa/Desativado por filtram a lista de fato.
2. A coluna Contratos/Aditivos exibe a contagem real por colaborador.
3. Importar CSV/Excel e Exportar funcionam ponta-a-ponta.

## Notas técnicas (front)
- Filtros suportados já ligados: `search`, `active` (Status), `status` (Situação Cadastral), `occupationAreas`
  (Área), `employmentRelationships` (Vínculo), `roles` (Função), `yearOfContract` (Ano de Contrato), `limit`.
- O front guarda os filtros como **singulares** na URL e mapeia p/ arrays na query (`collaborator-list.query.ts`).
