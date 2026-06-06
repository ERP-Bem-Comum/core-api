# Phase 0 — Research: `002-contracts-http-gaps`

> Todas as incógnitas materiais foram resolvidas no `/speckit-clarify` (sessão 2026-06-06), com parecer dos
> especialistas (typescript-language-expert, drizzle-orm-expert, security-backend-expert) e do MCP
> `acdg-skills` (DDD). Este documento consolida as decisões no formato Decision / Rationale / Alternatives.
> **Nenhum `NEEDS CLARIFICATION` remanescente.**

## R1 — Modelagem do `contractor` no agregado

- **Decision**: `ContractorRef = Readonly<{ type: ContractorType; id: ContractorId }>`. `ContractorType` é
  string-literal union `'supplier' | 'financier' | 'collaborator' | 'act'` (sem brand — o conjunto fechado já
  é a prova). `ContractorId` é Primitivo-brand (`Brand<string,'ContractorId'>`) com smart constructor
  `Result<ContractorId, 'contractor-id-invalid' | 'contractor-id-empty'>`. Vive em `contracts/domain/shared/contractor.ts`.
- **Rationale**: o contratado é aggregate root de **outro BC** (Parceiros). Referência por identidade preserva
  a fronteira de consistência (Vernon, _Implementing DDD_, p. 460: "Prefer references to external Aggregates only
  by their globally unique identity, not by holding a direct object reference"). A union rica das 4 variantes
  importaria `partners/*` em `contracts/domain` — viola ADR-0032 invariante 1 + FR-012. Exhaustividade vem do
  `switch` sobre `type` com `const _: never`, sem payload.
- **Alternatives considered**:
  - _Union discriminada das 4 variantes ricas no agregado_ — rejeitada (acoplamento cross-BC, contradição interna da spec).
  - _`ContractorType` branded_ — rejeitada (brandar union de literais não agrega prova além do tipo).

## R2 — Status HTTP e camada de validação do PATCH

- **Decision**: schema Zod do PATCH declara **apenas** `{title?,objective?,observations?,email?,telephone?}`,
  com `.strict()` (rejeita chave não declarada) e `.refine(obj => Object.keys(obj).length > 0)` (corpo vazio
  inválido). Campo imutável presente → **400** na borda; corpo vazio → **400**. Não há 422 (o campo imutável
  nunca chega ao domínio).
- **Rationale**: ADR-0027 — shape inválido é responsabilidade da borda (Zod), retorna 400; invariante de domínio
  retornaria 422. Como campos imutáveis **não** são declarados no schema, `.strict()` os barra antes do domínio.
  Mais simples e seguro contra mass-assignment (parecer security-backend-expert).
- **Alternatives considered**:
  - _Declarar campos imutáveis e rejeitar com 422 no domínio_ — rejeitada (mais código, desvia do padrão Zod-na-borda; ganho só de mensagem semântica).

## R3 — Estratégia de migration de `ctr_contracts`

- **Decision**: `contractor_type` (varchar(16), NOT NULL, CHECK `IN ('supplier','financier','collaborator','act')`)
  e `contractor_id` (varchar(36), NOT NULL) entram **sem `DEFAULT`/backfill** (tabela vazia, fase inicial).
  `observations` (varchar(1000)), `email` (varchar(255)), `telephone` (varchar(32)) — todos nullable. Sem índice
  secundário. Migration via `pnpm run db:generate`.
- **Rationale**: tabela sem dados persistentes (sem deploy) → `NOT NULL` direto é o mais limpo (parecer
  drizzle-orm-expert). varchar(16)+CHECK substitui ENUM nativo proibido (ADR-0020). varchar(36) = padrão UUID já
  usado em `ctr_contracts`. Sem query "contratos por contratado" → índice composto seria overhead sem retorno (YAGNI).
- **Alternatives considered**:
  - _`ADD COLUMN ... DEFAULT` + backfill + remove default_ — rejeitada por ora (sem dados); reabrir se surgir dado em prod antes da entrega.
  - _Índice `(contractor_type, contractor_id)`_ — adiado (criar via migration quando uma query alvo existir).
  - _Casing PascalCase (`'Supplier'`)_ — rejeitado: o `contractor-view.mapper.ts` retorna lowercase; casar 1:1 evita conversão na borda.

## R4 — Validação de existência do contratado na criação

- **Decision**: `POST` **grava a referência sem validar** existência em Parceiros. A leitura degrada com
  `snapshot: null` se o parceiro não existir (FR-006).
- **Rationale**: checagem síncrona criaria oráculo de enumeração de ids de parceiros e acoplaria a criação à
  disponibilidade de Parceiros (parecer security-backend-expert). UUID v4 torna enumeração inviável; degradação
  graciosa já cobre o caso de referência inválida. Risco aceito: contrato "órfão" silencioso.
- **Alternatives considered**:
  - _Validar via public-api no POST_ — rejeitada por ora (oráculo + acoplamento); se exigida no futuro, resposta de timing constante.

## R5 — Composição da leitura (rota gorda) e degradação

- **Decision**: `GET /contracts/:id` lê o agregado local e compõe o snapshot via `buildPartnersReadPort`
  (`partners/public-api/read.ts`) num módulo de borda `contractor-composition.ts`. Toda falha (not-found, IO,
  timeout) colapsa em `snapshot: null` — resposta observável idêntica (sem campo de motivo). Chamada com timeout
  explícito. Header `Sunset`/`Deprecation` (RFC 8594) na resposta.
- **Rationale**: ADR-0032 — composição na borda, núcleo intocado, transitória até o BFF v2. Colapsar causas
  elimina oráculo (security). Timeout impede que indisponibilidade de Parceiros derrube a leitura do contrato.
- **Alternatives considered**:
  - _Estender o agregado com dados de Parceiros_ — rejeitada por ADR-0032 (corrompe o núcleo).
  - _BFF compõe / frontend faz N chamadas_ — estado-alvo futuro (BFF v2 ainda não existe).

## R6 — Paridade do `ActView` (4º tipo)

- **Decision**: adicionar `ActView` + `actToView` ao `contractor-view.mapper.ts` e suporte a `type: 'act'` no
  `ContractorReadPort`/adapter. `ActView` espelha `CollaboratorView` (Act é placeholder clone enxuto de
  Collaborator — commit `PARTNERS-ACT-PLACEHOLDER`).
- **Rationale**: a `ContractorView` hoje cobre 3/4 (supplier/financier/collaborator). FR-005 exige paridade 4/4
  para o `switch` exaustivo da borda não falhar em `act`. Ticket próprio no módulo Parceiros (independente).
- **Alternatives considered**:
  - _Tratar `act` como caso especial na borda de contracts_ — rejeitada (vazaria conhecimento de Parceiros no `contracts`; o lugar canônico do mapper é `partners/public-api`).

## Premissas validadas no recon (código real)

- `ContractorReadPort` + `buildPartnersReadPort` existem (`partners/public-api/read.ts`) e ninguém consome — confirmado.
- `contractor-view.mapper.ts` cobre 3 tipos (sem `ActView`) — confirmado.
- `updateContract` existe no domínio (`contracts/domain/contract/contract.ts` + `types.ts`) — confirmado.
- `ctr_contracts` em `contracts/adapters/persistence/schemas/mysql.ts` sem colunas de contratado — confirmado.
- Plugin/DTOs HTTP de contracts existem (`adapters/http/plugin.ts`, `contract-dto.ts`, `schemas.ts`) — confirmado.
