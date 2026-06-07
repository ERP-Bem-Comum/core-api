# Feature Specification: Agregador de busca + paridade de export CSV do módulo `partners` (`/api/v1`)

**Feature Branch**: `003-partners-aggregator-export`

**Created**: 2026-06-06

**Status**: Draft

**Input**: User description: "Fechar os gaps restantes de borda HTTP do módulo `partners` sob `/api/v1` (ITENs 3 e 4 do ticket do front), fora do escopo da spec `001-partners-http-gaps` (já entregue): agregador de busca `GET /partners` e paridade de export CSV (collaborators/financiers/acts)."

> **Épico (melhorias, não-bloqueador).** Continuação da família partners `/api/v1` — a spec `001` entregou
> import/territorial/export-suppliers/categorias/filtros; a spec `002` (contracts) entregou o vínculo de
> contratado que **consome** o agregador desta spec. Aqui fechamos os ITENs 3 e 4 do `po-feedback`/ticket do
> front. **Estende** o módulo `partners` (borda já habilitada por ADR-0025/0033); não inaugura HTTP. Não altera
> o frontend — entrega a superfície que o BFF/cliente consome.

## Glossário / Linguagem ubíqua

| Termo                  | Significado                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Parceiro**           | Qualquer uma das 4 entidades do BC: `Supplier`, `Financier`, `Collaborator`, `Act`.                        |
| **Agregador**          | Endpoint único que busca/lista parceiros dos 4 tipos numa resposta paginada homogênea.                     |
| **Projeção plana**     | Item resumido do agregador: `{ type, id, name, document, active }` — não expõe o agregado interno.         |
| **Paridade de export** | Cada tipo de parceiro tem um `GET /<tipo>/export` (CSV), como já existe para fornecedores.                 |
| **Fan-out**            | Estratégia atual do front: 4 GETs separados (um por tipo) montados no cliente — que o agregador substitui. |
| **Envelope de erro**   | `{ error: { code, message, requestId } }` — formato canônico de erro HTTP do core-api.                     |

## Clarifications

### Session 2026-06-06

- Q: Como paginar/ordenar a lista heterogênea de 4 fontes no agregador (`GET /partners`)? → A: **Merge in-memory** — carrega os 4 readers em paralelo (`Promise.all`), projeta para `PartnerListItem`, aplica `search`/`type`, faz merge, **ordena por `(name ASC, type ASC, id ASC)`** (tie-break determinístico) e pagina **após** o merge. Consistente com o padrão já existente do partners (rotas por-tipo já paginam in-memory). **Safety cap** `MAX_TOTAL = 10_000`: se a soma dos 4 readers exceder, responde **503** (sem refatorar readers; paginação no DB fica para quando o volume/SLO exigir). _(parecer mysql-database-expert)_
- Q: Como autorizar `GET /partners` (cruza os 4 tipos)? → A: **AND das 4 permissões de leitura** — `supplier:read` **E** `financier:read` **E** `collaborator:read` **E** `act:read`. Quem consome o seletor (cria contrato de qualquer tipo) deve ler os 4; least-privilege sem criar permissão nova, simples de auditar. Se surgir perfil que contrata só um subconjunto de tipos, abre-se ADR para filtro dinâmico por permissão. _(parecer security-backend-expert)_

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Agregador de busca de parceiros (Priority: P2)

Como consumidor do front (BFF), quero um **endpoint único de busca de parceiros** que retorne os 4 tipos numa
lista paginada homogênea, para popular o **seletor de contratado** (usado no vínculo de contrato — feature 002)
sem precisar fazer 4 chamadas separadas e montar no cliente.

**Why this priority**: P2 — melhoria (não bloqueia; o fan-out de 4 GETs funciona hoje). Ganha relevância porque
o vínculo de contratado (feature 002) precisa de um seletor único de contratado de qualquer tipo.

**Independent Test**: Chamar `GET /api/v1/partners?search=&type=&page=&limit=` e validar que retorna itens dos
4 tipos (ou filtrados por `type`), paginados, com `meta` de paginação — sem depender da US-002.

**Acceptance Scenarios**:

1. **Given** parceiros dos 4 tipos cadastrados, **When** chamo `GET /api/v1/partners` sem `type`, **Then** recebo `{ items: [{ type, id, name, document, active }], meta: { itemCount, totalItems, itemsPerPage, totalPages, currentPage } }` com itens dos 4 tipos.
2. **Given** `type=supplier`, **When** chamo o agregador, **Then** recebo só fornecedores (mesma projeção plana).
3. **Given** `search=<termo>`, **When** busco, **Then** os itens casam o termo em `name` **ou** `document` (case-insensitive), em todos os tipos não filtrados.
4. **Given** `page`/`limit`, **When** pagino, **Then** `meta` reflete `page`, `limit`, `total`, `totalPages` e `items` traz a fatia correta (estratégia conforme decisão registrada em Clarifications).
5. **Given** requisição sem sessão/permissão, **When** chamo, **Then** recebo 401/403 com envelope (`requestId`).

---

### User Story 2 - Paridade de export CSV (Priority: P3)

Como gestor, quero **exportar a listagem de cada tipo de parceiro** em CSV (como já faço com fornecedores),
para análise externa — fechando a paridade entre os 4 tipos.

**Why this priority**: P3 — melhoria barata. `GET /suppliers/export` já existe (spec 001); `collaborators`
reusa o serializer `collaborator-csv.ts` existente (só falta a rota); `financiers`/`acts` precisam do serializer.

**Independent Test**: Chamar `GET /api/v1/collaborators/export` (e `/financiers/export`, `/acts/export`) com
filtros e validar que o CSV contém os registros que casam os filtros — sem depender da US-001.

**Acceptance Scenarios**:

1. **Given** filtros da listagem de colaboradores, **When** chamo `GET /api/v1/collaborators/export`, **Then** recebo um CSV com os colaboradores que casam os filtros.
2. **Given** financiadores cadastrados, **When** chamo `GET /api/v1/financiers/export`, **Then** recebo um CSV com os financiadores (serializer novo, espelhando o de fornecedores).
3. **Given** atos cadastrados, **When** chamo `GET /api/v1/acts/export`, **Then** recebo um CSV com os atos.
4. **Given** um campo iniciando com `=`/`+`/`-`/`@` (CSV injection), **When** exporto, **Then** o valor é escapado (util compartilhado), sem fórmula ativa.
5. **Given** requisição sem permissão `<tipo>:read`, **When** exporto, **Then** recebo 403 com envelope.

### Edge Cases

- **Agregador** com 0 parceiros → `{ items: [], meta: { itemCount: 0, totalItems: 0, itemsPerPage, totalPages: 0, currentPage } }` (não erro).
- **Agregador** com `type` inválido (fora dos 4) → erro de validação (envelope), não 500.
- **Agregador** `page` além do total → `items: []` com `meta` coerente.
- **Agregador** com soma dos 4 readers > `MAX_TOTAL` (10.000) → **503** (`partners-aggregate-too-large`), não OOM.
- **Export** de tipo com 0 registros → CSV só com cabeçalho.
- Qualquer rota nova sem sessão → 401; sem permissão → 403 (envelope com `requestId`).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema MUST expor `GET /api/v1/partners` que retorna parceiros dos 4 tipos numa **projeção plana** `{ type, id, name, document, active }`, paginada com `meta: { itemCount, totalItems, itemsPerPage, totalPages, currentPage }`.
- **FR-002**: O agregador MUST aceitar `type` (um dos 4 tipos ou ausente=todos), `search` (casa `name`/`document` case-insensitive), `page` e `limit`. A ordenação MUST ser `(name ASC, type ASC, id ASC)` (tie-break determinístico).
- **FR-003**: O agregador MUST **compor na borda** lendo os 4 readers existentes em paralelo (`Promise.all`), projetando para `PartnerListItem`, filtrando, fazendo merge e paginando **após** o merge (in-memory) — read-only, sem tabela nova, sem expor o agregado interno. MUST impor `MAX_TOTAL = 10_000` (soma dos 4 readers): se exceder, responde **503** (`code: 'partners-aggregate-too-large'`) — safety cap até a paginação no DB ser justificada por volume/SLO.
- **FR-004**: O sistema MUST expor `GET /api/v1/collaborators/export` (CSV) reusando o serializer `collaborator-csv.ts` existente, respeitando os filtros da listagem de colaboradores.
- **FR-005**: O sistema MUST expor `GET /api/v1/financiers/export` (CSV), com um serializer novo espelhando o padrão de `supplier-csv.ts`.
- **FR-006**: O sistema MUST expor `GET /api/v1/acts/export` (CSV), com um serializer novo espelhando o padrão de `supplier-csv.ts`.
- **FR-007**: Toda serialização CSV MUST usar o util compartilhado `src/shared/utils/csv.ts` (escape anti-CSV-injection + RFC 4180); respostas de export MUST ter `Content-Type: text/csv`, `Content-Disposition: attachment` e `X-Content-Type-Options: nosniff`.
- **FR-008**: Toda rota nova MUST exigir `requireAuth` + `authorize(...)` e usar o envelope de erro `{ error: { code, message, requestId } }`, com contrato Zod na borda. O **agregador** exige as **4 permissões de leitura** (`supplier:read` + `financier:read` + `collaborator:read` + `act:read`); cada **export** exige `<tipo>:read`.
- **FR-009**: As capacidades MUST permanecer sob `/api/v1` (ADR-0033, espelho legado); nenhuma migra para `/api/v2`.

### Key Entities

- **PartnerListItem**: projeção plana do agregador — `type` (`supplier|financier|collaborator|act`), `id`, `name`, `document`, `active`. Não persiste; é junção de leitura na borda.
- **PartnersPage**: envelope paginado do agregador — `{ items: PartnerListItem[], meta: { itemCount, totalItems, itemsPerPage, totalPages, currentPage } }`.
- **PartnerExport**: representação tabular (CSV) da listagem filtrada de um tipo de parceiro.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: O front consegue trocar o fan-out de 4 GETs por **1 chamada** ao agregador para popular o seletor de contratado, sem montar a junção no cliente.
- **SC-002**: O agregador devolve resultados dos 4 tipos com `meta` de paginação correta (`totalPages = ceil(totalItems/itemsPerPage)`).
- **SC-003**: 100% dos 4 tipos de parceiro têm `GET /<tipo>/export` (paridade completa).
- **SC-004**: Todo export escapa CSV-injection (campos `=`/`+`/`-`/`@`) — 0 fórmulas ativas no arquivo gerado.
- **SC-005**: Toda rota nova rejeita acesso sem sessão (401) e sem permissão (403), 100% das vezes, com envelope contendo `requestId`.

## Impacto Arquitetural (core-api) _(obrigatório se a feature toca `src/`)_

- **Bounded Contexts afetados**: [x] Parceiros (`par_*`) — apenas o módulo `partners`. Sem cross-BC (ADR-0014). O agregador lê os readers do próprio módulo.
- **Novos agregados / Value Objects?**: nenhum. Projeção `PartnerListItem` é DTO de borda (não domínio). Serializers `financier-csv.ts`/`act-csv.ts` são adapters de export (não domínio).
- **Novos eventos de domínio (outbox)?**: nenhum (capacidades são leitura/export de borda).
- **Novos subcomandos de CLI?**: não obrigatório (UX-alvo é a borda HTTP que o BFF consome).
- **Borda HTTP envolvida?**: **SIM** — e é o foco. Já habilitada (ADR-0025/0033). Estende plugins/rotas existentes de `partners` (`supplier-plugin`/`*-plugin` + um plugin/rota agregadora).
- **Possíveis violações da constituição (I–IX)?**: nenhuma prevista. Composição do agregador é leitura na borda (Princ. V — domínio puro intocado); serialização CSV no adapter; reuso do util `shared/utils/csv.ts`.

## Assumptions

- Os 4 readers (`supplier`/`financier`/`collaborator`/`act-reader`) já expõem listagem com filtro `search`/`active` suficiente para o agregador e para os exports — o trabalho é de **borda** (rota + composição + projeção), salvo ajuste mínimo revelado no planejamento.
- O serializer `collaborator-csv.ts` está correto e só falta a rota; `financier-csv.ts`/`act-csv.ts` serão criados espelhando `supplier-csv.ts`.
- **Permissão do agregador**: **decidida** (Clarifications) — AND das 4 reads (`supplier`/`financier`/`collaborator`/`act:read`). Sem permissão nova; filtro dinâmico por permissão fica como ADR futuro se surgir perfil de subconjunto.
- **Estratégia de paginação**: **decidida** (Clarifications) — merge in-memory + ordenação `(name, type, id)` + cap `MAX_TOTAL=10_000` (503). Migração para paginação no DB é trabalho futuro disparado por volume/SLO.
- Espelho do legado (ADR-0033): shapes/códigos preservados; o agregador é conveniência nova sob `/api/v1`, não redesenha os endpoints por-tipo.
- O catálogo/identidade de cada tipo é suficiente para a projeção plana (`name`/`document` existem nos 4).
- A variante PF de Financiador e itens fora dos ITENs 3/4 do front permanecem **fora** deste épico.
