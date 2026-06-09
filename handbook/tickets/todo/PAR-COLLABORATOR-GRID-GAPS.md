# Request — PAR-COLLABORATOR-GRID-GAPS

> Handoff do **front (web-app v2)** para o **core-api**. Padrão `000-request.md`.
> Origem: adequação do grid de Colaboradores ao sistema legado. Verificado em 2026-06-08.

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
